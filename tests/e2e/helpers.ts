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
