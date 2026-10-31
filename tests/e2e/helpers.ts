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
