import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { createPlan, createProject, fillPlanToReview, isPhoneViewport, nextStep, signUp, waitForSaved } from "./helpers";

/**
 * Picks an export format from the menu and returns the download. On touch emulation a tap
 * that lands while the menu is still opening is occasionally swallowed, so retry the tap.
 */
async function download(page: Page, format: "pdf" | "docx" | "md") {
  const label = { pdf: "PDF document", docx: "Word document (.docx)", md: "Markdown (.md)" }[format];
  const trigger = page.getByRole("button", { name: "Export" });
  const item = page.getByRole("menuitem", { name: label });

  for (let attempt = 1; attempt <= 3; attempt++) {
    const pending = page.waitForEvent("download", { timeout: 10_000 }).catch(() => null);
    await expect(async () => {
      if (!(await item.isVisible())) await trigger.click();
      await expect(item).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 10_000 });
    await item.click({ timeout: 5000 }).catch(() => {});
    const file = await pending;
    if (file) return file;
  }
  throw new Error(`The ${format} export never started a download`);
}

test.describe("research planner: creating plans", () => {
  test("a user can build a plan from start to finish and export it", async ({ page }) => {
    await signUp(page, { name: "Maya Patel" });
    await createProject(page, { name: "Budgeto", client: "Acme Co" });

    await page.goto("/tools/research-planner");
    await expect(page.getByText("No research plans yet")).toBeVisible();
    await page.getByRole("link", { name: "Create your first plan" }).click();
    const planId = await createPlan(page, { projectName: "Budgeto (Acme Co)", title: "Onboarding research" });

    await fillPlanToReview(page);

    // Generated materials only for the selected methods.
    const sections = page.getByRole("tabpanel", { name: "Plan sections" });
    for (const title of ["Interview discussion guide", "Usability testing tasks", "Observation checklist"]) {
      await expect(sections.getByRole("listitem", { name: title })).toBeVisible();
    }
    await expect(sections.getByRole("listitem", { name: "Survey questions" })).toHaveCount(0);

    // Preview shows the whole document.
    await page.getByRole("tab", { name: "Preview document" }).click();
    const preview = page.getByRole("article", { name: "Document preview" });
    await expect(preview.getByRole("heading", { level: 2, name: "Onboarding research" })).toBeVisible();
    await expect(preview).toContainText("Maya Patel");
    await expect(preview).toContainText("Acme Co");
    await expect(preview).toContainText("Why do users abandon onboarding?");
    await expect(preview.getByRole("heading", { level: 3 }).first()).toHaveText("Project context");

    // Exports.
    const md = await download(page, "md");
    expect(md.suggestedFilename()).toBe("onboarding-research-research-plan.md");
    const mdText = readFileSync((await md.path())!, "utf8");
    expect(mdText).toContain("# Onboarding research");
    expect(mdText).toContain("## Research goals");
    expect(mdText).toContain("1. Why do users abandon onboarding?");
    expect(mdText).toContain("## Interview discussion guide");
    expect(mdText).not.toContain("## Survey questions");
    expect(mdText).toContain("**Client:** Acme Co");

    const pdf = await download(page, "pdf");
    expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);
    const pdfBytes = readFileSync((await pdf.path())!);
    expect(pdfBytes.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdfBytes.length).toBeGreaterThan(5_000);

    const docx = await download(page, "docx");
    expect(docx.suggestedFilename()).toMatch(/\.docx$/);
    expect(readFileSync((await docx.path())!).subarray(0, 2).toString()).toBe("PK");

    // Completion.
    await page.getByRole("button", { name: "Mark plan as complete" }).click();
    await expect(page.getByText("This plan is marked as complete.")).toBeVisible();
    await page.goto("/tools/research-planner");
    const card = page.getByRole("article").filter({ hasText: "Onboarding research" });
    await expect(card.getByText("Completed")).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Onboarding research" })).toHaveAttribute("href", `/tools/research-planner/${planId}`);
  });

  test("required steps block progress with clear messages, optional fields do not", async ({ page }) => {
    await signUp(page);
    await createProject(page, { name: "Validation project" });
    await createPlan(page, { projectName: "Validation project", title: "Validation plan" });

    await nextStep(page);
    await expect(page.getByText("Briefly describe the product or service")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Project context" })).toBeVisible();

    // Jumping ahead through the stepper is also blocked.
    if (isPhoneViewport(page)) await page.getByLabel("Jump to step").selectOption("4");
    else await page.getByRole("button", { name: "Participants" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Project context" })).toBeVisible();

    // Optional fields stay optional.
    await page.getByLabel("Product or service").fill("Just a description");
    await nextStep(page);
    await expect(page.getByRole("heading", { level: 2, name: "Research goals" })).toBeVisible();
    await nextStep(page);
    await expect(page.getByText("State your primary research goal")).toBeVisible();
    await expect(page.getByText("Add at least one key research question")).toBeVisible();
    await page.getByLabel("Primary research goal").fill("A goal");
    await nextStep(page);
    await expect(page.getByText("Add at least one key research question")).toBeVisible();
    await page.getByRole("button", { name: "Add question", exact: true }).click();
    await page.getByLabel("Research question 1", { exact: true }).fill("Why?");
    await nextStep(page);
    await expect(page.getByRole("heading", { level: 2, name: "Research method" })).toBeVisible();
    await nextStep(page);
    await expect(page.getByText("Choose at least one research method")).toBeVisible();
  });

  test("a plan using only desk research needs no participants and can be completed", async ({ page }) => {
    await signUp(page);
    await createProject(page, { name: "Desk project" });
    await createPlan(page, { projectName: "Desk project", title: "Desk plan" });

    await page.getByLabel("Product or service").fill("An existing product");
    await nextStep(page);
    await page.getByLabel("Primary research goal").fill("Learn what is already known");
    await page.getByRole("button", { name: "Add question", exact: true }).click();
    await page.getByLabel("Research question 1", { exact: true }).fill("What does existing research say?");
    await nextStep(page);
    await page.getByRole("checkbox", { name: /^Secondary \/ desk research/ }).check();
    await nextStep(page);

    // Participants are optional because nothing here involves them.
    await expect(page.getByRole("heading", { level: 2, name: "Participants" })).toBeVisible();
    await expect(page.getByRole("note")).toContainText("everything on this step is optional");
    await nextStep(page);

    // No materials apply to desk research.
    await expect(page.getByText("No materials for these methods")).toBeVisible();
    await nextStep(page);
    await nextStep(page);

    await expect(page.getByRole("heading", { level: 2, name: "Review and export" })).toBeVisible();
    await expect(page.getByText("All required details are in.")).toBeVisible();
    await page.getByRole("button", { name: "Mark plan as complete" }).click();
    await expect(page.getByText("This plan is marked as complete.")).toBeVisible();
  });
});

test.describe("research planner: progress indicator", () => {
  test("a step only shows as complete once it has been reached and its required details are in", async ({ page }) => {
    await signUp(page);
    await createProject(page, { name: "Progress project" });
    await createPlan(page, { projectName: "Progress project", title: "Progress plan" });

    if (!isPhoneViewport(page)) {
      // Regression: step 4 has no required fields until a method is chosen, but it must not look done.
      for (const name of ["Goals", "Methods", "Participants", "Materials", "Logistics"]) {
        await expect(page.getByRole("button", { name })).not.toContainText("(complete)");
      }
    }
    await page.getByLabel("Product or service").fill("An app");
    await nextStep(page);
    if (!isPhoneViewport(page)) {
      await expect(page.getByRole("button", { name: "Context (complete)" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Participants" })).not.toContainText("(complete)");
      await expect(page.getByRole("button", { name: "Goals" })).toHaveAttribute("aria-current", "step");
    } else {
      await expect(page.getByRole("progressbar", { name: "Plan progress" })).toHaveAttribute("aria-valuenow", "2");
    }
  });
});

test.describe("research planner: methods", () => {
  test("methods are chosen manually; suggestions are optional and explained", async ({ page }) => {
    await signUp(page);
    await createProject(page, { name: "Methods project" });
    await createPlan(page, { projectName: "Methods project", title: "Methods plan" });

    await page.getByLabel("Product or service").fill("An app");
    await nextStep(page);
    await page.getByLabel("Primary research goal").fill("Understand drop-off");
    await page.getByRole("button", { name: "Add question", exact: true }).click();
    await page.getByLabel("Research question 1", { exact: true }).fill("Why do users abandon onboarding?");
    await page.getByRole("button", { name: "Add user question" }).click();
    await page.getByLabel("User question 1", { exact: true }).fill("How many users prefer the annual plan?");
    await nextStep(page);

    // Nothing is selected for the user.
    await expect(page.getByRole("checkbox", { checked: true })).toHaveCount(0);
    await expect(page.getByText("Several questions point here")).toHaveCount(0);

    await page.getByRole("button", { name: "Show suggestions" }).click();
    const list = page.getByRole("list", { name: "Suggested methods" });
    await expect(list.getByRole("button", { name: "Add User interviews" })).toBeVisible();
    await expect(list.getByRole("button", { name: "Add Surveys" })).toBeVisible();
    await expect(page.getByText(/not a rule: the best method depends on your context/)).toBeVisible();
    await expect(page.getByRole("checkbox", { checked: true })).toHaveCount(0);

    await page.getByRole("button", { name: "Add User interviews" }).click();
    await expect(page.getByRole("checkbox", { name: /^User interviews/ })).toBeChecked();
    await expect(page.getByRole("checkbox", { checked: true })).toHaveCount(1);

    // Un-selecting is just as easy, and the plan can use methods the engine never suggested.
    await page.getByRole("checkbox", { name: /^User interviews/ }).uncheck();
    await page.getByRole("checkbox", { name: /^Diary studies/ }).check();
    await expect(page.getByRole("checkbox", { checked: true })).toHaveCount(1);

    // Method details are available on each card.
    await page.locator("summary", { hasText: "When to use it" }).first().click();
    await expect(page.getByText("Useful when").first()).toBeVisible();

    // Combination guidance is informational.
    await page.getByRole("checkbox", { name: /^Card sorting/ }).check();
    await expect(page.getByRole("heading", { name: "Things to consider" })).toBeVisible();
    await expect(page.getByText(/tree testing is often used afterwards/)).toBeVisible();
    await nextStep(page);
    await expect(page.getByRole("heading", { level: 2, name: "Participants" })).toBeVisible();
  });
});

test.describe("research planner: saving and restoring", () => {
  test("autosaves, shows status, and restores an incomplete plan", async ({ page }) => {
    await signUp(page);
    await createProject(page, { name: "Autosave project" });
    const planId = await createPlan(page, { projectName: "Autosave project", title: "Autosave plan" });

    await page.getByLabel("Product or service").fill("Unfinished description");
    await expect(page.locator("[data-save-status]")).toHaveAttribute("data-save-status", /dirty|saving|saved/);
    await waitForSaved(page);
    await expect(page.getByText("All changes saved")).toBeVisible();

    // Reload mid-plan: nothing lost.
    await page.reload();
    await expect(page.getByLabel("Product or service")).toHaveValue("Unfinished description");
    await expect(page.getByLabel("Research title")).toHaveValue("Autosave plan");

    // Move on, save and leave, then resume at the same step.
    await nextStep(page);
    await page.getByLabel("Primary research goal").fill("Half-written goal");
    await page.getByRole("button", { name: "Save and continue later" }).click();
    await expect(page).toHaveURL(/\/tools\/research-planner$/);
    const card = page.getByRole("article").filter({ hasText: "Autosave plan" });
    await expect(card.getByText("Draft")).toBeVisible();
    await expect(card.getByText("Step 2 of 7")).toBeVisible();

    await page.getByRole("main").getByRole("link", { name: "Autosave plan" }).click();
    await expect(page).toHaveURL(new RegExp(`/tools/research-planner/${planId}`));
    await expect(page.getByRole("heading", { level: 2, name: "Research goals" })).toBeVisible();
    await expect(page.getByLabel("Primary research goal")).toHaveValue("Half-written goal");
  });

  test("generated content is editable and edits persist", async ({ page }) => {
    await signUp(page);
    await createProject(page, { name: "Edit project" });
    await createPlan(page, { projectName: "Edit project", title: "Edit plan" });
    await fillPlanToReview(page, { methods: ["User interviews"] });

    const sections = page.getByRole("tabpanel", { name: "Plan sections" });
    await sections.getByRole("button", { name: "Edit Interview questions" }).click();
    const q1 = sections.getByLabel("Question", { exact: true }).first();
    // Wait for the request that actually carries the edit, not for a status label.
    const saved = page.waitForResponse(
      (res) => res.request().method() === "POST" && (res.request().postData() ?? "").includes("My own custom interview question"),
    );
    await q1.fill("My own custom interview question");
    await sections.getByRole("button", { name: "Done editing Interview questions" }).click();
    await expect(sections).toContainText("My own custom interview question");
    expect((await saved).status()).toBe(200);
    await waitForSaved(page);

    await page.reload();
    await page.getByRole("tab", { name: "Preview document" }).click();
    await expect(page.getByRole("article", { name: "Document preview" })).toContainText("My own custom interview question");
  });

  test("sections can be reordered and the order is used in exports", async ({ page }) => {
    await signUp(page);
    await createProject(page, { name: "Order project" });
    await createPlan(page, { projectName: "Order project", title: "Order plan" });
    await fillPlanToReview(page, { methods: ["Surveys"] });

    const sections = page.getByRole("tabpanel", { name: "Plan sections" });
    const titles = () => sections.getByRole("heading", { level: 3 }).allTextContents();
    expect((await titles()).slice(0, 2)).toEqual(["Project context", "Research goals"]);

    await sections.getByRole("button", { name: "Move Research goals up" }).click();
    await expect.poll(titles).toEqual(expect.arrayContaining(["Research goals"]));
    await expect.poll(async () => (await titles()).slice(0, 2)).toEqual(["Research goals", "Project context"]);

    const file = await download(page, "md");
    const md = readFileSync((await file.path())!, "utf8");
    expect(md.indexOf("## Research goals")).toBeLessThan(md.indexOf("## Project context"));

    await page.reload();
    await expect.poll(async () => (await titles()).slice(0, 2)).toEqual(["Research goals", "Project context"]);
  });

  test("duplicates and deletes plans", async ({ page }) => {
    await signUp(page);
    await createProject(page, { name: "Dup project" });
    await createPlan(page, { projectName: "Dup project", title: "Original plan" });
    await page.getByLabel("Product or service").fill("Copy me");
    await waitForSaved(page);

    await page.goto("/tools/research-planner");
    await page.getByRole("button", { name: "Actions for Original plan" }).click();
    await page.getByRole("menuitem", { name: "Duplicate" }).click();
    await expect(page).toHaveURL(/\/tools\/research-planner\/[0-9a-f-]{36}/);
    await expect(page.getByLabel("Research title")).toHaveValue("Original plan (copy)");
    await expect(page.getByLabel("Product or service")).toHaveValue("Copy me");

    await page.goto("/tools/research-planner");
    await expect(page.getByRole("main").getByRole("link", { name: "Original plan (copy)" })).toBeVisible();
    await page.getByRole("button", { name: "Actions for Original plan (copy)" }).click();
    await page.getByRole("menuitem", { name: "Delete plan" }).click();
    await expect(page.getByRole("alertdialog")).toContainText("permanently deleted");
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete plan" }).click();
    await expect(page.getByRole("main").getByRole("link", { name: "Original plan (copy)" })).toHaveCount(0);
    await expect(page.getByRole("main").getByRole("link", { name: "Original plan", exact: true })).toBeVisible();
  });
});

test.describe("research planner: projects and isolation", () => {
  test("plans are associated with their project", async ({ page }) => {
    await signUp(page);
    const projectId = await createProject(page, { name: "Linked project" });
    await page.goto(`/projects/${projectId}`);
    await expect(page.getByText("No research in this project yet")).toBeVisible();
    await page.getByRole("main").getByRole("button", { name: "New" }).click();
    await page.getByRole("menuitem", { name: "Research plan" }).click();
    await expect(page.getByRole("combobox", { name: "Project" })).toHaveValue(projectId);
    await expect(page.getByLabel("Research title")).toHaveValue("Research plan for Linked project");
    await page.getByRole("button", { name: "Start planning" }).click();
    await expect(page).toHaveURL(/\/tools\/research-planner\/[0-9a-f-]{36}$/);

    await page.goto(`/projects/${projectId}`);
    await expect(page.getByRole("main").getByRole("link", { name: "Research plan for Linked project" })).toBeVisible();
  });

  test("deleting a project removes its plans", async ({ page }) => {
    await signUp(page);
    const projectId = await createProject(page, { name: "Doomed project" });
    await createPlan(page, { projectName: "Doomed project", title: "Doomed plan" });
    await page.goto(`/projects/${projectId}`);
    const trigger = page.getByRole("button", { name: "Actions for Doomed project" });
    const item = page.getByRole("menuitem", { name: "Delete project" });
    await expect(async () => {
      if (!(await item.isVisible())) await trigger.click();
      await expect(item).toBeVisible({ timeout: 1000 });
    }).toPass();
    await item.click({ timeout: 5000 }).catch(() => {});
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete project" }).click();
    await expect(page).toHaveURL(/\/projects$/);
    await page.goto("/tools/research-planner");
    await expect(page.getByText("No research plans yet")).toBeVisible();
  });

  test("another user cannot open, export or see a plan they do not own", async ({ page, browser }) => {
    await signUp(page, { name: "Owner" });
    await createProject(page, { name: "Private project" });
    const planId = await createPlan(page, { projectName: "Private project", title: "Secret plan" });
    await page.getByLabel("Product or service").fill("Confidential product");
    await waitForSaved(page);

    const other = await browser.newContext({ viewport: page.viewportSize() ?? undefined });
    const intruder = await other.newPage();
    await signUp(intruder, { name: "Intruder" });

    await intruder.goto(`/tools/research-planner/${planId}`);
    await expect(intruder.getByText("Research plan not found")).toBeVisible();
    await expect(intruder.getByText("Confidential product")).toHaveCount(0);
    await intruder.goto("/tools/research-planner");
    await expect(intruder.getByText("Secret plan")).toHaveCount(0);
    await expect(intruder.getByText("No research plans yet")).toBeVisible();

    for (const format of ["md", "pdf", "docx"]) {
      const res = await intruder.request.get(`/api/research-plans/${planId}/export?format=${format}`);
      expect(res.status(), format).toBe(404);
      expect(await res.text()).not.toContain("Confidential");
    }
    await other.close();

    // Signed-out requests are refused, and bad input is rejected.
    const anon = await browser.newContext();
    const anonRes = await anon.request.get(`${page.url().split("/tools")[0]}/api/research-plans/${planId}/export?format=md`);
    expect(anonRes.status()).toBe(401);
    await anon.close();
    const bad = await page.request.get(`/api/research-plans/${planId}/export?format=exe`);
    expect(bad.status()).toBe(400);
    const badId = await page.request.get(`/api/research-plans/not-a-uuid/export?format=md`);
    expect(badId.status()).toBe(404);

    // The owner still has access.
    const ok = await page.request.get(`/api/research-plans/${planId}/export?format=md`);
    expect(ok.status()).toBe(200);
    expect(ok.headers()["content-type"]).toContain("text/markdown");
    expect(ok.headers()["content-disposition"]).toContain("secret-plan-research-plan.md");
    expect(await ok.text()).toContain("Confidential product");
  });
});

test.describe("research planner: responsive", () => {
  test("the wizard fits the viewport and uses the right stepper", async ({ page }) => {
    await signUp(page);
    await createProject(page, { name: "Responsive project" });
    await createPlan(page, { projectName: "Responsive project", title: "Responsive plan" });

    if (isPhoneViewport(page)) {
      await expect(page.getByRole("navigation", { name: "Plan steps" })).toBeHidden();
      await expect(page.getByRole("progressbar", { name: "Plan progress" })).toBeVisible();
      await expect(page.getByLabel("Jump to step")).toBeVisible();
    } else {
      await expect(page.getByRole("navigation", { name: "Plan steps" })).toBeVisible();
      await expect(page.getByRole("progressbar")).toBeHidden();
    }

    for (const step of [1, 2, 3, 4, 5, 6, 7]) {
      await page.goto(`${page.url().split("?")[0]}?step=${step}`);
      await expect(page.getByText(`Step ${step} of 7`).filter({ visible: true }).first()).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `horizontal overflow on step ${step}`).toBeLessThanOrEqual(0);
    }
  });
});
