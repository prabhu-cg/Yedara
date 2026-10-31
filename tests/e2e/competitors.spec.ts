import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { createAnalysis, createProjectWithBrief, download, isPhoneViewport, nextStep, signUp, waitForSaved } from "./helpers";

const step = (page: Page, title: string) => expect(page.getByRole("heading", { level: 2, name: title })).toBeVisible();
const competitor = (page: Page, n: number) => page.locator('section[aria-label^="Competitor "]').nth(n - 1);

async function addCompetitor(page: Page, n: number, fields: { name: string; website?: string; type?: string; pricing?: string }) {
  await page.getByRole("button", { name: "Add competitor" }).click();
  const section = competitor(page, n);
  await expect(section).toBeVisible();
  await section.getByLabel("Name", { exact: true }).fill(fields.name);
  if (fields.website) await section.getByLabel("Website", { exact: true }).fill(fields.website);
  if (fields.type) await section.getByLabel("Type", { exact: true }).selectOption({ label: fields.type });
  if (fields.pricing) await section.getByLabel("Pricing information").fill(fields.pricing);
  return section;
}

async function addSource(section: ReturnType<typeof competitor>, fields: { url: string; title?: string; date?: string }) {
  await section.getByRole("button", { name: "Add source" }).click();
  const form = section.getByRole("group", { name: "New source" });
  await form.getByLabel("Source link").fill(fields.url);
  if (fields.title) await form.getByLabel("Source title").fill(fields.title);
  if (fields.date) await form.getByLabel("Date you looked at it").fill(fields.date);
  await form.getByRole("button", { name: "Add this source" }).click();
  await expect(section.getByRole("link", { name: fields.title ?? fields.url })).toBeVisible();
}

async function addCustomCriterion(page: Page, name: string, description = "") {
  await page.locator("#new-criterion-name").fill(name);
  if (description) await page.getByLabel("What does this criterion mean?").fill(description);
  await page.getByRole("button", { name: "Add criterion", exact: true }).click();
  await expect(page.getByRole("listitem", { name: new RegExp(`^Criterion \\d+: ${name}$`) })).toBeVisible();
}

const cell = (page: Page, criterion: string, competitorName: string) =>
  page.getByRole("button", { name: new RegExp(`^${criterion} for ${competitorName}: .*\\. Edit$`) });

async function fillCell(page: Page, criterion: string, competitorName: string, fields: { status?: string; value?: string; source?: string; notes?: string }) {
  await cell(page, criterion, competitorName).click();
  const editor = page.getByRole("region", { name: "Edit matrix cell" });
  await expect(editor).toContainText(criterion);
  if (fields.status) await editor.getByLabel("What do you know?").selectOption({ label: fields.status });
  if (fields.value) await editor.getByLabel("Value", { exact: true }).fill(fields.value);
  if (fields.source) await editor.getByLabel("Source", { exact: true }).selectOption({ label: fields.source });
  if (fields.notes) await editor.getByLabel("Notes", { exact: true }).fill(fields.notes);
}

/** Two competitors, two criteria, ready for the matrix. Lands on step 4. */
async function buildToMatrix(page: Page) {
  await nextStep(page);
  await step(page, "Competitors");
  const acme = await addCompetitor(page, 1, { name: "Acme Invoices", website: "https://acme.example", type: "Direct", pricing: "From $10 per month" });
  await addSource(acme, { url: "https://acme.example/pricing", title: "Acme pricing page", date: "2026-10-01" });
  await addCompetitor(page, 2, { name: "Spreadsheet", type: "Substitute" });
  await nextStep(page);
  await step(page, "Comparison criteria");
  await page.getByRole("button", { name: "Add suggested criterion Pricing" }).click();
  await expect(page.getByRole("listitem", { name: /^Criterion 1: Pricing$/ })).toBeVisible();
  await addCustomCriterion(page, "Offline mode", "Works without a connection");
  await nextStep(page);
  await step(page, "Comparison matrix");
}

test.describe("competitor analyzer: building an analysis", () => {
  test("goes from market context to an exported report, with sources and honest gaps", async ({ page }) => {
    await signUp(page, { name: "Maya Patel" });
    await createProjectWithBrief(page, { name: "Budgeto", industry: "Fintech", product: "A budgeting app", audience: "Freelancers" });
    await createAnalysis(page, { title: "Invoicing tools", projectName: "Budgeto" });

    await page.getByLabel("Market or category").fill("Invoicing software");
    await page.getByLabel("Geography").fill("UK and EU");
    await buildToMatrix(page);

    // Known with a source, not publicly available, and left alone (unknown).
    await fillCell(page, "Pricing", "Acme Invoices", { status: "Known", value: "$10 per month", source: "[S1] Acme pricing page", notes: "Billed annually" });
    await fillCell(page, "Pricing", "Spreadsheet", { status: "Not applicable" });
    await fillCell(page, "Offline mode", "Acme Invoices", { status: "Not publicly available", notes: "Checked the help centre" });
    await waitForSaved(page);

    await expect(cell(page, "Pricing", "Acme Invoices")).toContainText("$10 per month");
    await expect(cell(page, "Pricing", "Acme Invoices")).toContainText("[S1]");
    await expect(cell(page, "Offline mode", "Acme Invoices")).toContainText("Not publicly available");
    await expect(cell(page, "Offline mode", "Spreadsheet")).toContainText("Unknown");

    await nextStep(page);
    await step(page, "Analysis");
    await expect(page.getByRole("note")).toContainText("your interpretation");
    // The unknown cell is offered as further research, never as a weakness.
    await expect(page.getByText("Offline mode: not yet researched for Spreadsheet")).toBeVisible();
    await page.getByLabel("Positioning summary").fill("Acme is a premium, annual-billing product");
    await page.getByRole("button", { name: "Add strength", exact: true }).click();
    await page.getByLabel("Strength 1", { exact: true }).fill("Transparent pricing");
    await page.getByRole("button", { name: "Add opportunity", exact: true }).click();
    await page.getByLabel("Opportunity 1", { exact: true }).fill("Offline-first invoicing");

    await nextStep(page);
    await step(page, "Report");
    const preview = page.getByRole("region", { name: "Report preview" });
    await expect(preview).toContainText("Comparison matrix");
    await expect(preview).toContainText("$10 per month [S1]");
    await expect(preview).toContainText("Not publicly available");
    await expect(preview).toContainText("https://acme.example/pricing");
    await expect(preview).toContainText("1 October 2026");

    const md = readFileSync((await (await download(page, "md")).path())!, "utf8");
    expect(md).toContain("# Invoicing tools");
    expect(md).toContain("## Comparison matrix");
    expect(md).toContain("$10 per month [S1]");
    expect(md).toContain("Note: Billed annually");
    expect(md).toContain("Not publicly available");
    expect(md).toContain("| Criterion | Acme Invoices | Spreadsheet |");
    expect(md).toContain("A budgeting app");
    expect(md).toContain("Invoicing software");
    expect(md).toContain("## Sources");
    expect(md).toContain("1 October 2026");
    expect(md).toContain("researcher's interpretation");
    expect(md).toContain("Offline mode: not yet researched for Spreadsheet");
    expect(md).not.toMatch(/weakness/i);

    const pdf = readFileSync((await (await download(page, "pdf")).path())!);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    const docx = readFileSync((await (await download(page, "docx")).path())!);
    expect(docx.subarray(0, 2).toString()).toBe("PK");

    await page.getByRole("button", { name: "Mark analysis as complete" }).click();
    await expect(page.getByText("This analysis is marked as complete.")).toBeVisible();
  });

  test("won't move on without competitors or criteria, and warns about duplicates and bad links", async ({ page }) => {
    await signUp(page);
    await createProjectWithBrief(page, { name: "Validation project" });
    await createAnalysis(page, { title: "Validation", projectName: "Validation project" });

    await nextStep(page);
    await step(page, "Competitors");
    await nextStep(page);
    await expect(page.getByText("Add at least one competitor")).toBeVisible();
    await step(page, "Competitors");

    const section = await addCompetitor(page, 1, { name: "Acme" });
    await section.getByLabel("Website", { exact: true }).fill("not a link");
    await expect(section.getByText("Enter the address without spaces, for example acme.com")).toBeVisible();
    await section.getByRole("button", { name: "Add source" }).click();
    await section.getByRole("group", { name: "New source" }).getByRole("button", { name: "Add this source" }).click();
    await expect(section.getByText("Add the link to your source")).toBeVisible();
    await section.getByRole("group", { name: "New source" }).getByRole("button", { name: "Cancel" }).click();
    await section.getByLabel("Website", { exact: true }).fill("");

    await nextStep(page);
    await step(page, "Comparison criteria");
    await nextStep(page);
    await expect(page.getByText("Add at least one comparison criterion")).toBeVisible();

    await addCustomCriterion(page, "Support hours");
    await page.locator("#new-criterion-name").fill("support HOURS");
    await page.getByRole("button", { name: "Add criterion", exact: true }).click();
    await expect(page.getByText("That criterion is already in the list")).toBeVisible();
    await expect(page.getByRole("listitem", { name: /^Criterion \d+:/ })).toHaveCount(1);

    // The suggested button for a criterion you already have is disabled.
    await page.getByRole("button", { name: "Add suggested criterion Pricing" }).click();
    await expect(page.getByRole("button", { name: "Add suggested criterion Pricing" })).toBeDisabled();
    await nextStep(page);
    await step(page, "Comparison matrix");
  });

  test("keeps a competitor of every type, and removing one removes its matrix entries", async ({ page }) => {
    await signUp(page);
    await createProjectWithBrief(page, { name: "Types project" });
    await createAnalysis(page, { title: "Types", projectName: "Types project" });
    await nextStep(page);
    for (const [n, type] of ["Direct", "Indirect", "Substitute", "Emerging"].entries()) {
      await addCompetitor(page, n + 1, { name: `${type} one`, type });
      await expect(competitor(page, n + 1).locator(`[data-competitor-type="${type.toLowerCase()}"]`)).toBeVisible();
    }
    await waitForSaved(page);
    await page.reload();
    await expect(competitor(page, 4).getByLabel("Name", { exact: true })).toHaveValue("Emerging one");
    await expect(competitor(page, 2).getByLabel("Type", { exact: true })).toHaveValue("indirect");

    // Reorder, then remove with confirmation.
    await page.getByRole("button", { name: "Move Emerging one earlier" }).click();
    await expect(competitor(page, 3).getByLabel("Name", { exact: true })).toHaveValue("Emerging one");
    await competitor(page, 3).getByRole("button", { name: "Remove Emerging one" }).click();
    await competitor(page, 3).getByRole("button", { name: "Confirm: Remove Emerging one" }).click();
    await expect(page.locator('section[aria-label^="Competitor "]')).toHaveCount(3);
    await page.reload();
    await expect(page.locator('section[aria-label^="Competitor "]')).toHaveCount(3);
  });

  test("a matrix entry survives a reload, and removing a source unlinks it without losing the entry", async ({ page }) => {
    await signUp(page);
    await createProjectWithBrief(page, { name: "Matrix project" });
    const id = await createAnalysis(page, { title: "Matrix", projectName: "Matrix project" });
    await buildToMatrix(page);
    await fillCell(page, "Pricing", "Acme Invoices", { status: "Known", value: "$10 per month", source: "[S1] Acme pricing page" });
    await waitForSaved(page);

    await page.reload();
    await expect(cell(page, "Pricing", "Acme Invoices")).toContainText("$10 per month");
    await expect(cell(page, "Pricing", "Acme Invoices")).toContainText("[S1]");

    await page.goto(`/tools/competitor-analyzer/${id}?step=2`);
    await competitor(page, 1).getByRole("button", { name: "Remove source Acme pricing page" }).click();
    await competitor(page, 1).getByRole("button", { name: "Confirm: Remove source Acme pricing page" }).click();
    await expect(competitor(page, 1).getByRole("link", { name: "Acme pricing page" })).toHaveCount(0);

    await page.goto(`/tools/competitor-analyzer/${id}?step=4`);
    await expect(cell(page, "Pricing", "Acme Invoices")).toContainText("$10 per month");
    await expect(cell(page, "Pricing", "Acme Invoices")).not.toContainText("[S1]");
  });

  test("autosaves and resumes an unfinished analysis", async ({ page }) => {
    await signUp(page);
    await createProjectWithBrief(page, { name: "Resume project" });
    await createAnalysis(page, { title: "Resumable", projectName: "Resume project" });
    await nextStep(page);
    await addCompetitor(page, 1, { name: "Half-done Co" });
    await waitForSaved(page);
    await page.getByRole("button", { name: "Save and continue later" }).click();
    await expect(page).toHaveURL(/\/tools\/competitor-analyzer$/);
    const card = page.getByRole("article").filter({ hasText: "Resumable" });
    await expect(card.getByText("Draft")).toBeVisible();
    await expect(card.getByText("Step 2 of 6")).toBeVisible();
    await expect(card.getByText("1 competitor")).toBeVisible();
    await page.getByRole("main").getByRole("link", { name: "Resumable" }).click();
    await step(page, "Competitors");
    await expect(competitor(page, 1).getByLabel("Name", { exact: true })).toHaveValue("Half-done Co");
  });
});

test.describe("competitor analyzer: shared project context", () => {
  test("inherits the project brief and overrides it for one analysis without touching the project", async ({ page }) => {
    await signUp(page);
    const projectId = await createProjectWithBrief(page, {
      name: "Brief project",
      industry: "Healthcare",
      product: "A patient scheduling app",
      audience: "Clinic receptionists",
      objectives: "Reduce missed appointments",
    });
    const id = await createAnalysis(page, { title: "Scheduling tools", projectName: "Brief project" });

    await expect(page.locator("#field-product_service")).toContainText("A patient scheduling app");
    await expect(page.locator("#field-industry")).toContainText("Healthcare");
    await expect(page.locator("#field-target_audience")).toContainText("Clinic receptionists");
    await expect(page.locator("#field-research_objectives")).toContainText("Reduce missed appointments");
    await expect(page.getByText("From project").first()).toBeVisible();

    await page.getByRole("button", { name: "Override Target audience for this analysis" }).click();
    await page.getByLabel("Target audience", { exact: true }).fill("Hospital administrators");
    await expect(page.getByText("Overridden for this analysis")).toBeVisible();
    await waitForSaved(page);

    await page.goto(`/tools/competitor-analyzer/${id}`);
    await expect(page.getByLabel("Target audience", { exact: true })).toHaveValue("Hospital administrators");

    await page.goto(`/projects/${projectId}/edit`);
    await expect(page.getByLabel("Target audience")).toHaveValue("Clinic receptionists");

    // The override reaches the report; the untouched fields still come from the project.
    await page.goto(`/tools/competitor-analyzer/${id}?step=6`);
    const preview = page.getByRole("region", { name: "Report preview" });
    await expect(preview).toContainText("Hospital administrators");
    await expect(preview).toContainText("A patient scheduling app");
    await expect(preview).not.toContainText("Clinic receptionists");

    await page.goto(`/tools/competitor-analyzer/${id}`);
    await page.getByRole("button", { name: "Reset Target audience to the project value" }).click();
    await expect(page.locator("#field-target_audience")).toContainText("Clinic receptionists");

    // A second analysis in the same project still inherits the original.
    await createAnalysis(page, { title: "Second", projectName: "Brief project" });
    await expect(page.locator("#field-target_audience")).toContainText("Clinic receptionists");
  });

  test("points to the project when its brief is empty", async ({ page }) => {
    await signUp(page);
    await createProjectWithBrief(page, { name: "Empty brief project" });
    await createAnalysis(page, { title: "Blank", projectName: "Empty brief project" });
    await expect(page.locator("#field-product_service")).toContainText("Not set in the project brief");
    await expect(page.getByRole("link", { name: "Add it to the project" }).first()).toBeVisible();
  });
});

test.describe("competitor analyzer: dashboard and project integration", () => {
  test("shows analyses and personas on the project page and the dashboard", async ({ page }) => {
    await signUp(page);
    const projectId = await createProjectWithBrief(page, { name: "Hub project", product: "A hub" });
    await createAnalysis(page, { title: "Hub analysis", projectName: "Hub project" });

    await page.goto(`/projects/${projectId}`);
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: "Research" })).toBeVisible();
    await expect(main.getByRole("link", { name: "Hub analysis" })).toBeVisible();
    await expect(main.locator("li[data-kind=analysis]")).toContainText("Competitor analysis");
    // The brief is tucked away until asked for.
    await expect(main.getByText("A hub")).toBeHidden();
    await main.getByText("Project brief").click();
    await expect(main.getByText("A hub")).toBeVisible();
    await main.getByRole("button", { name: "New" }).click();
    await page.getByRole("menuitem", { name: "Competitor analysis" }).click();
    await expect(page.getByRole("combobox", { name: "Project" })).toHaveValue(projectId);

    await page.goto("/recent");
    // The Recent page names the tool and the project for each item.
    const row = page.getByRole("main").locator("tr[data-kind=analysis]").filter({ hasText: "Hub analysis" });
    await expect(row).toContainText("Competitor analysis");
    await expect(row).toContainText("Hub project");
    await row.getByRole("link", { name: /Hub analysis/ }).click();
    await step(page, "Market context");

    await page.goto("/tools/competitor-analyzer");
    await expect(page.getByRole("heading", { level: 1, name: "Competitor Analyzer" })).toBeVisible();
  });
});

test.describe("competitor analyzer: access control and responsive", () => {
  test("another user cannot open, export or see an analysis they do not own", async ({ page, browser }) => {
    await signUp(page, { name: "Owner" });
    await createProjectWithBrief(page, { name: "Private analysis project" });
    const id = await createAnalysis(page, { title: "Secret analysis", projectName: "Private analysis project" });
    await nextStep(page);
    await addCompetitor(page, 1, { name: "Confidential Corp" });
    await waitForSaved(page);

    const other = await browser.newContext({ viewport: page.viewportSize() ?? undefined });
    const intruder = await other.newPage();
    await signUp(intruder, { name: "Intruder" });
    await intruder.goto(`/tools/competitor-analyzer/${id}`);
    await expect(intruder.getByText("Analysis not found")).toBeVisible();
    await expect(intruder.getByText("Confidential Corp")).toHaveCount(0);

    await intruder.goto("/tools/competitor-analyzer");
    await expect(intruder.getByText("Secret analysis")).toHaveCount(0);
    await expect(intruder.getByText("No competitor analyses yet")).toBeVisible();

    for (const format of ["md", "pdf", "docx"]) {
      const res = await intruder.request.get(`/api/competitor-analyses/${id}/export?format=${format}`);
      expect(res.status(), format).toBe(404);
    }
    await other.close();

    const anon = await browser.newContext();
    expect((await anon.request.get(`${page.url().split("/tools")[0]}/api/competitor-analyses/${id}/export?format=md`)).status()).toBe(401);
    await anon.close();
    expect((await page.request.get(`/api/competitor-analyses/${id}/export?format=exe`)).status()).toBe(400);
    expect((await page.request.get(`/api/competitor-analyses/not-a-uuid/export?format=md`)).status()).toBe(404);
    const ok = await page.request.get(`/api/competitor-analyses/${id}/export?format=md`);
    expect(ok.status()).toBe(200);
    expect(await ok.text()).toContain("Confidential Corp");
  });

  test("every step fits every viewport, including a wide matrix", async ({ page }) => {
    await signUp(page);
    await createProjectWithBrief(page, { name: "Responsive analysis project" });
    const id = await createAnalysis(page, { title: "Responsive", projectName: "Responsive analysis project" });
    await nextStep(page);
    for (const [n, name] of ["First Competitor With A Rather Long Name", "Second Competitor With A Rather Long Name", "Third One", "Fourth One"].entries()) {
      await addCompetitor(page, n + 1, { name });
    }
    await nextStep(page);
    for (const name of ["A fairly long criterion name that wraps", "Second criterion"]) await addCustomCriterion(page, name);
    await waitForSaved(page);

    if (isPhoneViewport(page)) {
      await expect(page.getByRole("progressbar", { name: "Plan progress" })).toBeVisible();
      await expect(page.getByLabel("Jump to step")).toBeVisible();
    } else {
      await expect(page.getByRole("navigation", { name: "Plan steps" })).toBeVisible();
    }
    for (const s of [1, 2, 3, 4, 5, 6]) {
      await page.goto(`/tools/competitor-analyzer/${id}?step=${s}`);
      await expect(page.getByText(`Step ${s} of 6`).filter({ visible: true }).first()).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `horizontal overflow on step ${s}`).toBeLessThanOrEqual(0);
    }
  });
});
