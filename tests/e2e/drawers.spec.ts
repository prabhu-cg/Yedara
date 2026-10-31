import { expect, test } from "@playwright/test";
import { createProject, signUp } from "./helpers";

const drawer = (page: import("@playwright/test").Page) => page.getByRole("dialog");

test.describe("new and edit forms open in a right-hand drawer", () => {
  test("new project: opens over the list, slides in from the right, and cancels back", async ({ page }) => {
    await signUp(page);
    await page.goto("/projects");
    await page.getByRole("link", { name: /new project/i }).first().click();

    await expect(drawer(page)).toBeVisible();
    await expect(page).toHaveURL(/\/projects\/new$/);
    await expect(drawer(page).getByRole("heading", { name: "Create a project" })).toBeVisible();
    // The list stays underneath, and the drawer is pinned to the right edge.
    // Radix hides the page underneath from assistive tech while the drawer is open, so look in the DOM.
    await expect(page.locator("h1", { hasText: "My Projects" })).toBeAttached();
    // Once the slide-in has settled, the drawer's right edge sits on the viewport's right edge.
    const rightEdge = async () => {
      const box = await drawer(page).boundingBox();
      return Math.round(box!.x + box!.width);
    };
    await expect.poll(rightEdge).toBe(page.viewportSize()!.width);

    await drawer(page).getByRole("button", { name: "Cancel" }).click();
    await expect(drawer(page)).toHaveCount(0);
    await expect(page).toHaveURL(/\/projects$/);
  });

  test("Escape and the close button also close it; refresh shows the full page instead", async ({ page }) => {
    await signUp(page);
    await page.goto("/projects");
    await page.getByRole("link", { name: /new project/i }).first().click();
    await expect(drawer(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(drawer(page)).toHaveCount(0);

    await page.getByRole("link", { name: /new project/i }).first().click();
    await drawer(page).getByRole("button", { name: "Close" }).click();
    await expect(drawer(page)).toHaveCount(0);

    await page.getByRole("link", { name: /new project/i }).first().click();
    await expect(drawer(page)).toBeVisible();
    await page.reload();
    await expect(drawer(page)).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1, name: "Create a project" })).toBeVisible();
  });

  test("creating a project from the drawer lands on the project, with the drawer gone", async ({ page }) => {
    await signUp(page);
    await page.goto("/projects");
    await page.getByRole("link", { name: /new project/i }).first().click();
    await drawer(page).getByLabel("Project name").fill("Drawer project");
    await drawer(page).getByRole("button", { name: "Create project" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Drawer project" })).toBeVisible();
    await expect(drawer(page)).toHaveCount(0);
  });

  test("edit project: saves from the drawer and the page underneath shows the change", async ({ page }) => {
    await signUp(page);
    await createProject(page, { name: "Before" });
    await page.getByRole("link", { name: /edit/i }).first().click();
    await expect(drawer(page).getByRole("heading", { name: "Edit project" })).toBeVisible();
    await drawer(page).getByLabel("Project name").fill("After");
    await drawer(page).getByRole("button", { name: "Save changes" }).click();
    await expect(drawer(page)).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1, name: "After" })).toBeVisible();
  });

  test("new plan, persona and analysis open as drawers and preselect the project", async ({ page }) => {
    await signUp(page);
    await createProject(page, { name: "Alpha" });
    const url = page.url();

    for (const [item, heading, path] of [
      ["Research plan", "New research plan", "research-planner"],
      ["Persona", "New persona", "persona-builder"],
      ["Competitor analysis", "New competitor analysis", "competitor-analyzer"],
    ] as const) {
      await page.goto(url);
      await page.getByRole("main").getByRole("button", { name: "New" }).click();
      await page.getByRole("menuitem", { name: item }).click();
      await expect(drawer(page).getByRole("heading", { name: heading })).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`/tools/${path}/new`));
      await expect(drawer(page).getByLabel("Project")).toHaveValue(/.+/);
      await drawer(page).getByRole("button", { name: "Cancel" }).click();
      await expect(drawer(page)).toHaveCount(0);
      await expect(page).toHaveURL(url);
    }
  });
});
