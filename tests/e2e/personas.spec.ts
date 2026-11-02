import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { createPersona, createProjectWithBrief, download, isPhoneViewport, nextStep, signUp, waitForSaved } from "./helpers";

const step = (page: Page, title: string) => expect(page.getByRole("heading", { level: 2, name: title })).toBeVisible();

async function addListItem(page: Page, addLabel: string, itemLabel: string, text: string) {
  await page.getByRole("button", { name: addLabel, exact: true }).click();
  await page.getByLabel(itemLabel, { exact: true }).fill(text);
}

async function addEvidence(page: Page, kind: string, text: string, fields: Record<string, string> = {}) {
  await page.getByRole("button", { name: `Add ${kind.toLowerCase()}`, exact: true }).click();
  const form = page.getByRole("form", { name: `Add ${kind.toLowerCase()}` });
  await form.getByLabel(`New ${kind.toLowerCase()}`, { exact: true }).fill(text);
  for (const [label, value] of Object.entries(fields)) await form.getByLabel(label).fill(value);
  await form.getByRole("button", { name: `Add ${kind.toLowerCase()}` }).click();
}

/** Fill the required fields of a hypothesis persona and land on the output step. */
async function fillToOutput(page: Page, options: { evidence?: () => Promise<void> } = {}) {
  await page.getByLabel("Background").fill("Freelance designer with irregular income");
  await nextStep(page);
  await step(page, "Behaviour");
  await addListItem(page, "Add goal", "Goal 1", "Get paid on time without chasing");
  await nextStep(page);
  await step(page, "User needs");
  await nextStep(page);
  await step(page, "Evidence");
  await options.evidence?.();
  await nextStep(page);
  await step(page, "Persona output");
}

test.describe("persona builder: building a persona", () => {
  test("a hypothesis persona goes from start to finish, labelled as unvalidated, and exports", async ({ page }) => {
    await signUp(page, { name: "Maya Patel" });
    await createProjectWithBrief(page, { name: "Budgeto", industry: "Fintech" });
    await createPersona(page, { name: "Time-poor Tamsin", projectName: "Budgeto" });

    // Default type is the honest one.
    await expect(page.getByRole("radio", { name: /^Hypothesis/ })).toBeChecked();
    await expect(page.getByRole("note", { name: "Hypothesis persona" })).toContainText("has not been validated with users");

    await nextStep(page); // step 1 has everything it needs (name + project)
    await step(page, "User profile");
    await fillToOutput(page, {
      evidence: async () => {
        await addEvidence(page, "Assumption", "Prefers mobile over desktop");
        await addEvidence(page, "Unvalidated hypothesis", "Would pay more for automatic reminders");
        await expect(page.getByText("Unvalidated", { exact: true }).first()).toBeVisible();
      },
    });

    // Output: the type is visible everywhere it matters.
    await expect(page.getByRole("heading", { level: 1, name: "Time-poor Tamsin" })).toBeVisible();
    const profile = page.getByRole("tabpanel", { name: "Persona profile" });
    await expect(profile.locator('[data-persona-type="hypothesis"]')).toBeVisible();
    await expect(profile.getByRole("note")).toContainText("hypothesis");
    await expect(profile).toContainText("Prefers mobile over desktop");
    await expect(profile).toContainText("Initials stand in for a photo");

    await page.getByRole("tab", { name: "Document preview" }).click();
    const preview = page.getByRole("article", { name: "Document preview" });
    await expect(preview).toContainText("Evidence status");
    await expect(preview).toContainText("Hypothesis");

    const md = readFileSync((await (await download(page, "md")).path())!, "utf8");
    expect(md).toContain("# Time-poor Tamsin");
    expect(md).toContain("**Persona type:** Hypothesis");
    expect(md).toContain("## Evidence status");
    expect(md).toContain("has not been validated with users");
    expect(md).toContain("Prefers mobile over desktop [Unvalidated]");
    expect(md).not.toMatch(/participant quote/i);
    expect(md).not.toMatch(/interview/i);

    const pdf = readFileSync((await (await download(page, "pdf")).path())!);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    const docx = readFileSync((await (await download(page, "docx")).path())!);
    expect(docx.subarray(0, 2).toString()).toBe("PK");

    await page.getByRole("button", { name: "Mark persona as complete" }).click();
    await expect(page.getByText("This persona is marked as complete.")).toBeVisible();
  });

  test("a research-backed persona needs real research, and every quote needs a source", async ({ page }) => {
    await signUp(page);
    await createProjectWithBrief(page, { name: "Evidence project" });
    await createPersona(page, { name: "Researched Rae", projectName: "Evidence project", type: "Research-backed" });

    await nextStep(page);
    await page.getByLabel("Background").fill("Product manager at a mid-size SaaS company");
    await nextStep(page);
    await addListItem(page, "Add goal", "Goal 1", "Ship fewer, better features");
    await nextStep(page);
    await nextStep(page);
    await step(page, "Evidence");

    // Blocked until there is research behind the claim.
    await nextStep(page);
    await expect(page.getByText("A research-backed persona needs at least one research source")).toBeVisible();
    await expect(page.getByText("Add at least one observation or quote from that research")).toBeVisible();
    await step(page, "Evidence");

    await addEvidence(page, "Research source", "Six interviews with product managers", { "Source of new research source": "Discovery round 2, Oct 2026" });
    await nextStep(page);
    await expect(page.getByText("Add at least one observation or quote from that research")).toBeVisible();

    // A quote cannot be added without saying where it came from.
    await page.getByRole("button", { name: "Add participant quote", exact: true }).click();
    const form = page.getByRole("form", { name: "Add participant quote" });
    await form.getByLabel("New participant quote", { exact: true }).fill("I only look at the roadmap when someone complains");
    await form.getByRole("button", { name: "Add participant quote" }).click();
    await expect(form.getByText("Say where this quote came from")).toBeVisible();
    await form.getByLabel("Source of new participant quote").fill("Interview P3, 12 Oct");
    await form.getByLabel("Participant (ID or pseudonym)").fill("P3");
    await form.getByRole("button", { name: "Add participant quote" }).click();
    await expect(page.getByLabel("Participant quote 1", { exact: true })).toHaveValue("I only look at the roadmap when someone complains");

    await nextStep(page);
    await step(page, "Persona output");
    const profile = page.getByRole("tabpanel", { name: "Persona profile" });
    await expect(profile.locator('[data-persona-type="research_backed"]')).toBeVisible();
    await expect(profile.getByRole("note")).toContainText("Based on 1 research source");
    await expect(profile).toContainText("I only look at the roadmap when someone complains");
    await expect(profile).toContainText("Interview P3, 12 Oct");

    const md = readFileSync((await (await download(page, "md")).path())!, "utf8");
    expect(md).toContain("**Persona type:** Research-backed");
    expect(md).toContain("“I only look at the roadmap when someone complains”");
    expect(md).toContain("Source: Interview P3, 12 Oct");
    expect(md).toContain("Participant: P3");

    await page.getByRole("button", { name: "Mark persona as complete" }).click();
    await expect(page.getByText("This persona is marked as complete.")).toBeVisible();
  });

  test("demographics need a stated justification", async ({ page }) => {
    await signUp(page);
    await createProjectWithBrief(page, { name: "Demographics project" });
    await createPersona(page, { name: "Demo Dan", projectName: "Demographics project" });
    await nextStep(page);
    await page.getByLabel("Background").fill("Works in logistics");
    await page.getByRole("button", { name: "Add demographic detail" }).click();
    await page.getByLabel("Detail", { exact: true }).fill("Region");
    await page.getByLabel("Value", { exact: true }).fill("Rural Scotland");

    await nextStep(page);
    await expect(page.getByText("Explain why these demographic details matter to your research, or remove them")).toBeVisible();
    await step(page, "User profile");

    await page.getByLabel("Why do these details matter to your research?").fill("Connectivity limits how they can use the product");
    await nextStep(page);
    await step(page, "Behaviour");
  });

  test("autosaves and resumes an unfinished persona", async ({ page }) => {
    await signUp(page);
    await createProjectWithBrief(page, { name: "Resume project" });
    await createPersona(page, { name: "Resumable Rhea", projectName: "Resume project" });
    await nextStep(page);
    await page.getByLabel("Background").fill("Half-finished background");
    await waitForSaved(page);
    await page.reload();
    await expect(page.getByLabel("Background")).toHaveValue("Half-finished background");

    await page.getByRole("button", { name: "Save and continue later" }).click();
    await expect(page).toHaveURL(/\/tools\/persona-builder$/);
    const card = page.getByRole("article").filter({ hasText: "Resumable Rhea" });
    await expect(card.getByText("Draft")).toBeVisible();
    await expect(card.getByText("Step 2 of 6")).toBeVisible();
    await page.getByRole("main").getByRole("link", { name: "Resumable Rhea" }).click();
    await step(page, "User profile");
    await expect(page.getByLabel("Background")).toHaveValue("Half-finished background");
  });

  test("evidence persists after a reload and can be edited or removed", async ({ page }) => {
    await signUp(page);
    await createProjectWithBrief(page, { name: "Persist project" });
    const id = await createPersona(page, { name: "Persistent Pia", projectName: "Persist project" });
    await page.goto(`/tools/persona-builder/${id}?step=5`);
    await addEvidence(page, "Assumption", "Checks email first thing");
    await page.getByLabel("Assumption 1", { exact: true }).fill("Checks email at lunch");
    await waitForSaved(page);

    await page.reload();
    await expect(page.getByLabel("Assumption 1", { exact: true })).toHaveValue("Checks email at lunch");

    await page.getByRole("button", { name: "Remove Assumption 1" }).click();
    await expect(page.getByLabel("Assumption 1", { exact: true })).toHaveCount(0);
    await page.reload();
    await expect(page.getByLabel("Assumption 1", { exact: true })).toHaveCount(0);
  });
});

test.describe("persona builder: illustrative portrait", () => {
  test("a chosen portrait shows on the persona and the document preview, labelled, and exports", async ({ page }) => {
    await signUp(page, { name: "Maya Patel" });
    await createProjectWithBrief(page, { name: "Budgeto", industry: "Fintech" });
    await createPersona(page, { name: "Time-poor Tamsin", projectName: "Budgeto" });
    await nextStep(page);
    await step(page, "User profile");

    // Initials are the default; a portrait is an explicit choice.
    await expect(page.getByRole("radio", { name: "Initials, no photo" })).toBeChecked();
    await page.locator("label", { has: page.getByRole("radio", { name: "Older man with glasses and a grey beard" }) }).click();
    await expect(page.getByRole("radio", { name: "Older man with glasses and a grey beard" })).toBeChecked();

    await fillToOutput(page);
    const profile = page.getByRole("tabpanel", { name: "Persona profile" });
    await expect(profile.getByRole("img", { name: "Older man with glasses and a grey beard" })).toBeVisible();
    await expect(profile).toContainText("Illustrative stock photo. Not a real participant.");

    await page.getByRole("tab", { name: "Document preview" }).click();
    const preview = page.getByRole("article", { name: "Document preview" });
    await expect(preview.getByRole("img", { name: "Older man with glasses and a grey beard" })).toBeVisible();
    await expect(preview).toContainText("Illustrative stock photo. Not a real participant.");
    await expect(preview).not.toContainText("Unsplash");

    const md = readFileSync((await (await download(page, "md")).path())!, "utf8");
    expect(md).toMatch(/!\[[^\]]+\]\([^)]+\/personas\/avatars\/02\.jpg\)/);
    expect(md).toContain("Illustrative stock photo. Not a real participant.");
    const pdf = await download(page, "pdf");
    expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);

    // The choice survives a reload, and switching back to initials removes it from the preview.
    await page.reload();
    await page.getByRole("tab", { name: "Document preview" }).click();
    await expect(page.getByRole("article", { name: "Document preview" }).getByRole("img", { name: /grey beard/ })).toBeVisible();

    // The portrait follows the persona into the places that list it.
    const portrait = 'img[src*="personas%2Favatars"], img[src*="personas/avatars"]'; // next/image encodes the path
    await page.goto("/tools/persona-builder");
    await expect(page.locator("article", { hasText: "Time-poor Tamsin" }).locator(portrait)).toBeVisible();
    await page.goto("/recent");
    await expect(page.locator("tr", { hasText: "Time-poor Tamsin" }).locator(portrait)).toBeVisible();
    await page.goto("/tools/persona-builder");
    await page.getByRole("link", { name: "Time-poor Tamsin" }).click();
    await page.getByRole("link", { name: "Compare" }).click();
    await expect(page.locator("th", { hasText: "Time-poor Tamsin" }).locator(portrait)).toBeVisible();
  });
});

test.describe("persona builder: shared project context", () => {
  test("inherits the project brief and overrides it for one persona without touching the project", async ({ page }) => {
    await signUp(page);
    const projectId = await createProjectWithBrief(page, {
      name: "Brief project",
      industry: "Healthcare",
      product: "A patient scheduling app",
      audience: "Clinic receptionists",
      objectives: "Reduce missed appointments",
    });
    const id = await createPersona(page, { name: "Inheriting Ivy", projectName: "Brief project" });

    const product = page.locator("#field-product_service");
    await expect(product).toContainText("A patient scheduling app");
    await expect(page.locator("#field-industry")).toContainText("Healthcare");
    await expect(page.getByText("From project").first()).toBeVisible();

    await page.getByRole("button", { name: "Override Product or service for this persona" }).click();
    await page.getByLabel("Product or service", { exact: true }).fill("A pharmacy collection kiosk");
    await expect(page.getByText("Overridden for this persona")).toBeVisible();
    await expect(page.getByText(/Your project is not changed/)).toBeVisible();
    await waitForSaved(page);

    // The override survives a reload for this persona...
    await page.goto(`/tools/persona-builder/${id}`);
    await expect(page.getByLabel("Product or service", { exact: true })).toHaveValue("A pharmacy collection kiosk");

    // ...but the project's own brief is unchanged.
    await page.goto(`/projects/${projectId}/edit`);
    await expect(page.getByLabel("Product or service")).toHaveValue("A patient scheduling app");

    // A second persona still inherits the original value.
    await createPersona(page, { name: "Second Sam", projectName: "Brief project" });
    await expect(page.locator("#field-product_service")).toContainText("A patient scheduling app");

    // Reset returns the first persona to the project value.
    await page.goto(`/tools/persona-builder/${id}`);
    await page.getByRole("button", { name: "Reset Product or service to the project value" }).click();
    await expect(page.locator("#field-product_service")).toContainText("A patient scheduling app");
  });

  test("shows a prompt to complete the brief when the project has none", async ({ page }) => {
    await signUp(page);
    await createProjectWithBrief(page, { name: "Empty brief project" });
    await createPersona(page, { name: "Blank Bea", projectName: "Empty brief project" });
    await expect(page.locator("#field-product_service")).toContainText("Not set in the project brief");
    await expect(page.getByRole("link", { name: "Add it to the project" }).first()).toBeVisible();
  });
});

test.describe("persona builder: several personas", () => {
  test("keeps multiple personas per project, duplicates them and compares them", async ({ page }) => {
    await signUp(page);
    await createProjectWithBrief(page, { name: "Multi project" });

    for (const [name, type, goal] of [["Alpha Alex", "Hypothesis", "Save time"], ["Beta Bo", "Proto-persona", "Save time"]] as const) {
      await createPersona(page, { name, projectName: "Multi project", type });
      await nextStep(page);
      await page.getByLabel("Background").fill(`${name} background`);
      await nextStep(page);
      await addListItem(page, "Add goal", "Goal 1", goal);
      await waitForSaved(page);
    }

    await page.goto("/tools/persona-builder");
    const alpha = page.getByRole("article").filter({ hasText: "Alpha Alex" });
    const beta = page.getByRole("article").filter({ hasText: "Beta Bo" });
    await expect(alpha.locator('[data-persona-type="hypothesis"]')).toBeVisible();
    await expect(beta.locator('[data-persona-type="proto"]')).toBeVisible();

    // Duplicate keeps type and content.
    await page.getByRole("button", { name: "Actions for Alpha Alex" }).click();
    await page.getByRole("menuitem", { name: "Duplicate" }).click();
    await expect(page).toHaveURL(/\/tools\/persona-builder\/[0-9a-f-]{36}/);
    await expect(page.getByRole("heading", { level: 1, name: "Alpha Alex (copy)" })).toBeVisible();
    await expect(page.getByRole("radio", { name: /^Hypothesis/ })).toBeChecked();
    await nextStep(page);
    await expect(page.getByLabel("Background")).toHaveValue("Alpha Alex background");

    // Compare two personas side by side.
    await page.goto("/tools/persona-builder/compare");
    await page.getByRole("checkbox", { name: /^Alpha Alex\s+Hypothesis$/ }).check();
    await page.getByRole("checkbox", { name: /^Beta Bo\s+Proto-persona$/ }).check();
    await page.getByRole("button", { name: "Compare selected" }).click();
    const table = page.getByRole("region", { name: "Persona comparison table" });
    await expect(table.getByRole("link", { name: "Alpha Alex" })).toBeVisible();
    await expect(table.getByRole("link", { name: "Beta Bo" })).toBeVisible();
    await expect(table.getByRole("row", { name: /Persona type/ })).toContainText("Hypothesis");
    await expect(table.getByRole("row", { name: /Persona type/ })).toContainText("Proto-persona");
    await expect(page.getByRole("region", { name: "Common to all" })).toContainText("Save time");
    await expect(table.getByRole("row", { name: /Role or occupation/ })).toContainText("Not provided");
  });
});

test.describe("persona builder: access control and responsive", () => {
  test("another user cannot open, export, compare or see a persona they do not own", async ({ page, browser }) => {
    await signUp(page, { name: "Owner" });
    await createProjectWithBrief(page, { name: "Private persona project" });
    const id = await createPersona(page, { name: "Secret Sue", projectName: "Private persona project" });
    await nextStep(page);
    await page.getByLabel("Background").fill("Confidential background");
    await waitForSaved(page);

    const other = await browser.newContext({ viewport: page.viewportSize() ?? undefined });
    const intruder = await other.newPage();
    await signUp(intruder, { name: "Intruder" });
    await intruder.goto(`/tools/persona-builder/${id}`);
    await expect(intruder.getByText("Persona not found")).toBeVisible();
    await expect(intruder.getByText("Confidential background")).toHaveCount(0);

    await intruder.goto("/tools/persona-builder");
    await expect(intruder.getByText("Secret Sue")).toHaveCount(0);
    await expect(intruder.getByText("No personas yet")).toBeVisible();

    await intruder.goto(`/tools/persona-builder/compare?ids=${id}`);
    await expect(intruder.getByText("Secret Sue")).toHaveCount(0);

    for (const format of ["md", "pdf", "docx"]) {
      const res = await intruder.request.get(`/api/personas/${id}/export?format=${format}`);
      expect(res.status(), format).toBe(404);
    }
    await other.close();

    const anon = await browser.newContext();
    expect((await anon.request.get(`${page.url().split("/tools")[0]}/api/personas/${id}/export?format=md`)).status()).toBe(401);
    await anon.close();
    expect((await page.request.get(`/api/personas/${id}/export?format=exe`)).status()).toBe(400);
    expect((await page.request.get(`/api/personas/not-a-uuid/export?format=md`)).status()).toBe(404);
    const ok = await page.request.get(`/api/personas/${id}/export?format=md`);
    expect(ok.status()).toBe(200);
    expect(await ok.text()).toContain("Confidential background");
  });

  test("the wizard fits every viewport", async ({ page }) => {
    await signUp(page);
    await createProjectWithBrief(page, { name: "Responsive persona project" });
    const id = await createPersona(page, { name: "Responsive Remi", projectName: "Responsive persona project" });
    if (isPhoneViewport(page)) {
      await expect(page.getByRole("progressbar", { name: "Plan progress" })).toBeVisible();
      await expect(page.getByLabel("Jump to step")).toBeVisible();
    } else {
      await expect(page.getByRole("navigation", { name: "Plan steps" })).toBeVisible();
    }
    for (const s of [1, 2, 3, 4, 5, 6]) {
      await page.goto(`/tools/persona-builder/${id}?step=${s}`);
      await expect(page.getByText(`Step ${s} of 6`).filter({ visible: true }).first()).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `horizontal overflow on step ${s}`).toBeLessThanOrEqual(0);
    }
  });
});
