import { expect, type Page } from "@playwright/test";

export const PASSWORD = "Sup3rsecret!";

export function uniqueEmail(prefix = "user") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export async function signUp(page: Page, options: { name?: string; email?: string } = {}) {
  const email = options.email ?? uniqueEmail();
  const name = options.name ?? "Test User";
  await page.goto("/signup");
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  return { email, name };
}

export async function createProject(
  page: Page,
  fields: { name: string; description?: string; client?: string; industry?: string },
) {
  await page.goto("/projects/new");
  await page.getByLabel("Project name").fill(fields.name);
  if (fields.description) await page.getByLabel("Description").fill(fields.description);
  if (fields.client) await page.getByLabel("Client").fill(fields.client);
  if (fields.industry) await page.getByLabel("Industry").fill(fields.industry);
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}$/);
  return page.url().split("/").pop()!;
}

/** True below Tailwind `md`: the planner shows its compact step selector instead of the full stepper. */
export function isPhoneViewport(page: Page) {
  return (page.viewportSize()?.width ?? 1280) < 768;
}

/** True when the viewport uses the slide-over navigation (below Tailwind `lg`). */
export function isCompactViewport(page: Page) {
  return (page.viewportSize()?.width ?? 1280) < 1024;
}

/**
 * Opens a project's actions menu and clicks an item. Retries because a click
 * that lands before React hydrates the menu is silently ignored.
 */
export async function chooseProjectAction(page: Page, projectName: string, action: string) {
  const trigger = page.getByRole("button", { name: `Actions for ${projectName}` });
  const item = page.getByRole("menuitem", { name: action });
  await expect(async () => {
    if (!(await item.isVisible())) await trigger.click();
    await expect(item).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 10_000 });
  await item.click();
}

/* ---------------- Research Planner ---------------- */

export async function createPlan(page: Page, options: { projectName: string; title?: string }) {
  await page.goto("/tools/research-planner/new");
  if (options.title) await page.getByLabel("Research title").fill(options.title);
  await page.getByRole("combobox", { name: "Project" }).selectOption({ label: options.projectName });
  await page.getByRole("button", { name: "Start planning" }).click();
  await expect(page).toHaveURL(/\/tools\/research-planner\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 2, name: "Project context" })).toBeVisible();
  return page.url().split("/").pop()!.split("?")[0];
}

export const nextStep = (page: Page) => page.getByRole("button", { name: /^(Next|Review plan|Review)$/ }).click();

export async function waitForSaved(page: Page) {
  await expect(page.locator("[data-save-status]")).toHaveAttribute("data-save-status", /^(saved|idle)$/, { timeout: 10_000 });
}

/** Fills the required fields and walks to the review step. Materials are generated for interview + usability methods. */
export async function fillPlanToReview(page: Page, options: { methods?: string[]; generate?: boolean } = {}) {
  const methods = options.methods ?? ["User interviews", "Usability testing"];
  await page.getByLabel("Product or service").fill("A budgeting app for freelancers");
  await page.getByLabel("Business background").fill("Seed-stage startup");
  await nextStep(page);

  await expect(page.getByRole("heading", { level: 2, name: "Research goals" })).toBeVisible();
  await page.getByLabel("Primary research goal").fill("Understand why freelancers drop off during onboarding");
  await page.getByRole("button", { name: "Add question", exact: true }).click();
  await page.getByLabel("Research question 1", { exact: true }).fill("Why do users abandon onboarding?");
  await nextStep(page);

  await expect(page.getByRole("heading", { level: 2, name: "Research method" })).toBeVisible();
  for (const m of methods) await page.getByRole("checkbox", { name: new RegExp(`^${m}`) }).check();
  await nextStep(page);

  await expect(page.getByRole("heading", { level: 2, name: "Participants" })).toBeVisible();
  await page.getByLabel("Participant profile").fill("Freelancers with irregular income");
  await nextStep(page);

  await expect(page.getByRole("heading", { level: 2, name: "Research materials" })).toBeVisible();
  if (options.generate !== false) {
    const generate = page.getByRole("button", { name: /Generate (all|remaining) materials/ });
    if (await generate.isVisible()) {
      await generate.click();
      await expect(page.getByText("Starter draft").first()).toBeVisible();
    }
  }
  await nextStep(page);

  await expect(page.getByRole("heading", { level: 2, name: "Research logistics" })).toBeVisible();
  await page.getByLabel("Research duration").fill("4 weeks");
  await nextStep(page);
  await expect(page.getByRole("heading", { level: 2, name: "Review and export" })).toBeVisible();
}

/* ---------------- Phase 3: shared project brief, personas ---------------- */

export async function createProjectWithBrief(
  page: Page,
  fields: { name: string; industry?: string; product?: string; audience?: string; objectives?: string },
) {
  await page.goto("/projects/new");
  await page.getByLabel("Project name").fill(fields.name);
  if (fields.industry) await page.getByLabel("Industry").fill(fields.industry);
  if (fields.product) await page.getByLabel("Product or service").fill(fields.product);
  if (fields.audience) await page.getByLabel("Target audience").fill(fields.audience);
  if (fields.objectives) await page.getByLabel("Research objectives").fill(fields.objectives);
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}$/);
  return page.url().split("/").pop()!;
}

export async function createPersona(
  page: Page,
  options: { name: string; projectName: string; type?: "Research-backed" | "Hypothesis" | "Proto-persona" },
) {
  await page.goto("/tools/persona-builder/new");
  await page.getByLabel("Persona name or identifier").fill(options.name);
  await page.getByRole("combobox", { name: "Project" }).selectOption({ label: options.projectName });
  if (options.type) await page.getByRole("radio", { name: new RegExp(`^${options.type}`) }).check();
  await page.getByRole("button", { name: "Start building" }).click();
  await expect(page).toHaveURL(/\/tools\/persona-builder\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 2, name: "Persona context" })).toBeVisible();
  return page.url().split("/").pop()!.split("?")[0];
}

export async function download(page: Page, format: "pdf" | "docx" | "md") {
  const label = { pdf: "PDF document", docx: "Word document (.docx)", md: "Markdown (.md)" }[format];
  const trigger = page.getByRole("button", { name: "Export" });
  const item = page.getByRole("menuitem", { name: label });
  for (let attempt = 1; attempt <= 3; attempt++) {
    const pending = page.waitForEvent("download", { timeout: 10_000 }).catch(() => null);
    await expect(async () => {
      if (!(await item.isVisible())) await trigger.click();
      await expect(item).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 10_000 });
    // The menu can close under the pointer on slower runs; a short click timeout lets the next attempt reopen it.
    await item.click({ timeout: 5000 }).catch(() => {});
    const file = await pending;
    if (file) return file;
  }
  throw new Error(`The ${format} export never started a download`);
}

export async function createAnalysis(page: Page, options: { title: string; projectName: string }) {
  await page.goto("/tools/competitor-analyzer/new");
  await page.getByLabel("Analysis title").fill(options.title);
  await page.getByRole("combobox", { name: "Project" }).selectOption({ label: options.projectName });
  await page.getByRole("button", { name: "Start analysis" }).click();
  await expect(page).toHaveURL(/\/tools\/competitor-analyzer\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 2, name: "Market context" })).toBeVisible();
  return page.url().split("/").pop()!.split("?")[0];
}

/** The main navigation: always on screen from `lg`, inside the slide-over drawer below it. */
export async function openNav(page: Page) {
  if (isCompactViewport(page)) await page.getByRole("button", { name: "Open navigation menu" }).click();
  return page.getByRole("navigation", { name: "Main" });
}

/* ---------------- Research Synthesizer ---------------- */

export async function createSynthesis(page: Page, options: { title: string; projectName: string }) {
  await page.goto("/tools/research-synthesizer/new");
  await page.getByLabel("Synthesis title").fill(options.title);
  await page.getByRole("combobox", { name: "Project" }).selectOption({ label: options.projectName });
  await page.getByRole("button", { name: "Start synthesis" }).click();
  await expect(page).toHaveURL(/\/tools\/research-synthesizer\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("tab", { name: "Research material", selected: true })).toBeVisible();
  return page.url().split("/").pop()!.split("?")[0];
}

/** Adds one observation card through the "Add a statement" form. */
export async function addObservation(page: Page, content: string, fields: { participant?: string; tags?: string } = {}) {
  await page.getByRole("button", { name: "Add a statement" }).click();
  const form = page.getByRole("form", { name: "Add observation" });
  await form.getByLabel("What was observed or said").fill(content);
  if (fields.participant) await form.getByLabel("Participant").fill(fields.participant);
  if (fields.tags) await form.getByLabel("Tags").fill(fields.tags);
  await form.getByRole("button", { name: "Add observation" }).click();
  await expect(page.locator("[data-observation]").filter({ hasText: content })).toBeVisible();
  // The form is in a drawer: wait for it to finish sliding out so the page behind it is usable again.
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

export const selectTab = (page: Page, name: string) => page.getByRole("tab", { name }).click();

/** Clicks an in-page export button and returns the downloaded file's contents. */
export async function exportFromButton(page: Page, label: "PDF" | "Word" | "Markdown") {
  const pending = page.waitForEvent("download", { timeout: 15_000 });
  await page.getByRole("button", { name: `Export as ${label}` }).click();
  const file = await pending;
  const path = await file.path();
  return { name: file.suggestedFilename(), path };
}

/* ---------------- Journey Mapper ---------------- */

export async function createJourney(page: Page, options: { name: string; projectName: string; persona?: string; state?: "Current state" | "Future state" }) {
  await page.goto("/tools/journey-mapper/new");
  await page.getByLabel("Journey name").fill(options.name);
  await page.getByRole("combobox", { name: "Project" }).selectOption({ label: options.projectName });
  if (options.persona) await page.getByRole("combobox", { name: "Persona" }).selectOption({ label: options.persona });
  if (options.state) await page.getByRole("combobox", { name: "State" }).selectOption({ label: options.state });
  await page.getByRole("button", { name: "Start mapping" }).click();
  await expect(page).toHaveURL(/\/tools\/journey-mapper\/[0-9a-f-]{36}(\?.*)?$/);
  await expect(page.getByRole("tab", { name: "Edit stages", selected: true })).toBeVisible();
  return page.url().split("/").pop()!.split("?")[0];
}

export async function addStage(page: Page, name: string) {
  const before = await page.getByRole("textbox", { name: /^Name of stage \d+$/ }).count();
  await page.getByLabel("New stage name").fill(name);
  await page.getByRole("button", { name: "Add stage", exact: true }).click();
  await expect(page.getByRole("textbox", { name: `Name of stage ${before + 1}` })).toHaveValue(name);
}

const escapeRegExp = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Adds an item to a stage's group, e.g. ("Discover", "User actions", "Searches online"). */
export async function addJourneyItem(page: Page, stageName: string, group: string, text: string) {
  const stage = page.getByRole("region", { name: new RegExp(`^Stage \\d+: ${escapeRegExp(stageName)}$`) });
  const box = stage.getByRole("group", { name: `${group} for ${stageName}` });
  await box.getByRole("textbox", { name: /^Add / }).fill(text);
  await box.getByRole("button", { name: /confirm$/ }).click();
  await expect(box.getByRole("textbox", { name: new RegExp(`^[A-Za-z ]+: ${escapeRegExp(text.slice(0, 40))}`) })).toBeVisible();
}
