import { expect, test } from "@playwright/test";
import { chooseProjectAction, createProject, signUp } from "./helpers";

test.describe("projects", () => {
  test("creates a project and shows its details", async ({ page }) => {
    await signUp(page);
    await createProject(page, {
      name: "Checkout research",
      description: "Why do people abandon the cart?",
      client: "Acme Co",
      industry: "E-commerce",
    });
    await expect(page.getByRole("heading", { level: 1, name: "Checkout research" })).toBeVisible();
    await expect(page.getByText("Why do people abandon the cart?")).toBeVisible();
    await expect(page.getByText("Acme Co")).toBeVisible();
    await expect(page.getByText("E-commerce")).toBeVisible();
    await expect(page.getByText("Planning").first()).toBeVisible();
  });

  test("validates the project form", async ({ page }) => {
    await signUp(page);
    await page.goto("/projects/new");
    await page.getByRole("button", { name: "Create project" }).click();
    await expect(page.getByText("Project name is required")).toBeVisible();
    await page.getByLabel("Project name").fill("x".repeat(121));
    await page.getByRole("button", { name: "Create project" }).click();
    await expect(page.getByText("Use 120 characters or fewer")).toBeVisible();
    await expect(page).toHaveURL(/\/projects\/new$/);
  });

  test("edits project details and status", async ({ page }) => {
    await signUp(page);
    const id = await createProject(page, { name: "Original name" });

    await page.goto(`/projects/${id}/edit`);
    await page.getByLabel("Project name").fill("Renamed project");
    await page.getByLabel("Client").fill("New Client");
    await page.getByLabel("Status").selectOption("review");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page).toHaveURL(new RegExp(`/projects/${id}$`));
    await expect(page.getByRole("heading", { level: 1, name: "Renamed project" })).toBeVisible();
    await expect(page.getByText("New Client")).toBeVisible();
    await expect(page.getByText("Review", { exact: true })).toBeVisible();
  });

  test("lists, searches and filters projects", async ({ page }) => {
    await signUp(page);
    await createProject(page, { name: "Alpha onboarding", client: "Globex" });
    const betaId = await createProject(page, { name: "Beta pricing" });
    await page.goto(`/projects/${betaId}/edit`);
    await page.getByLabel("Status").selectOption("completed");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/${betaId}$`));

    await page.goto("/projects");
    await expect(page.getByRole("heading", { level: 3 })).toHaveCount(2);

    await page.getByLabel("Search projects").fill("alpha");
    await expect(page).toHaveURL(/q=alpha/);
    await expect(page.getByRole("heading", { level: 3 })).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Alpha onboarding" })).toBeVisible();

    // Search also matches the client name.
    await page.getByLabel("Search projects").fill("globex");
    await expect(page.getByRole("link", { name: "Alpha onboarding" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Beta pricing" })).toHaveCount(0);

    await page.getByLabel("Search projects").fill("no-such-project");
    await expect(page.getByText("No projects match your filters")).toBeVisible();

    await page.getByRole("link", { name: "Clear filters" }).click();
    await expect(page).toHaveURL(/\/projects$/);
    await expect(page.getByLabel("Search projects")).toHaveValue("");
    await page.getByLabel("Filter by status").selectOption("completed");
    await expect(page).toHaveURL(/status=completed/);
    await expect(page.getByRole("link", { name: "Beta pricing" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Alpha onboarding" })).toHaveCount(0);
  });

  test("treats search input as plain text, not filter syntax", async ({ page }) => {
    await signUp(page);
    await createProject(page, { name: "Plain project" });
    await page.goto("/projects");
    await page.getByLabel("Search projects").fill("a),status.eq.archived,(name.ilike.%");
    await expect(page.getByText("No projects match your filters")).toBeVisible();
    await page.getByLabel("Search projects").fill("100%_");
    await expect(page.getByText("No projects match your filters")).toBeVisible();
  });

  test("archives and restores a project", async ({ page }) => {
    await signUp(page);
    const id = await createProject(page, { name: "Archive me" });
    await page.goto(`/projects/${id}/edit`);
    await page.getByLabel("Status").selectOption("review");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/${id}$`));

    await chooseProjectAction(page, "Archive me", "Archive project");
    await expect(page.getByText("This project is archived")).toBeVisible();

    // Hidden from the default list, visible under Archived.
    await page.goto("/projects");
    await expect(page.getByRole("link", { name: "Archive me" })).toHaveCount(0);
    await page.goto("/projects?status=archived");
    await expect(page.getByRole("link", { name: "Archive me" })).toBeVisible();

    await page.getByRole("link", { name: "Archive me" }).click();
    // Wait for the detail page so the list card's identical menu isn't matched mid-navigation.
    await expect(page).toHaveURL(new RegExp(`/projects/${id}$`));
    await expect(page.getByRole("heading", { level: 1, name: "Archive me" })).toBeVisible();
    await chooseProjectAction(page, "Archive me", "Restore project");
    await expect(page.getByText("This project is archived")).toHaveCount(0);
    // Restores the status it had before archiving.
    await expect(page.getByText("Review", { exact: true })).toBeVisible();
  });

  test("asks for confirmation before deleting a project", async ({ page }) => {
    await signUp(page);
    const id = await createProject(page, { name: "Delete me" });

    await chooseProjectAction(page, "Delete me", "Delete project");
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText("permanently deleted");

    // Cancelling keeps the project.
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
    await page.goto(`/projects/${id}`);
    await expect(page.getByRole("heading", { level: 1, name: "Delete me" })).toBeVisible();

    await chooseProjectAction(page, "Delete me", "Delete project");
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete project" }).click();
    await expect(page).toHaveURL(/\/projects$/);
    await expect(page.getByText("No projects yet")).toBeVisible();

    await page.goto(`/projects/${id}`);
    await expect(page.getByText("Project not found")).toBeVisible();
  });

  test("dashboard reflects real project data", async ({ page }) => {
    await signUp(page, { name: "Grace Hopper" });
    await expect(page.getByText("You don't have any projects yet")).toBeVisible();
    await expect(page.getByText("Getting started")).toBeVisible();

    const id = await createProject(page, { name: "Dashboard project" });
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Welcome back, Grace");
    await expect(page.getByText("You don't have any projects yet")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Recent projects" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Dashboard project" }).first()).toBeVisible();
    // Nothing has been edited yet, so the "Recently edited" list stays hidden.
    await expect(page.getByRole("heading", { name: "Recently edited" })).toHaveCount(0);

    await page.goto(`/projects/${id}/edit`);
    await page.getByLabel("Project name").fill("Dashboard project (edited)");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/${id}$`));
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Recently edited" })).toBeVisible();
    // Real counts: one planning project, none elsewhere.
    await expect(page.getByRole("link", { name: /Planning\s*1/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Completed\s*0/ })).toBeVisible();
  });
});

test.describe("project ownership", () => {
  test("another user cannot view, edit or delete a project they do not own", async ({ page, browser }) => {
    // Owner creates a project.
    await signUp(page, { name: "Owner" });
    const id = await createProject(page, { name: "Private research" });

    // A second, independent user tries to reach it.
    const other = await browser.newContext({ viewport: page.viewportSize() ?? undefined });
    const intruder = await other.newPage();
    await signUp(intruder, { name: "Intruder" });

    await intruder.goto(`/projects/${id}`);
    await expect(intruder.getByText("Project not found")).toBeVisible();
    await expect(intruder.getByText("Private research")).toHaveCount(0);

    await intruder.goto(`/projects/${id}/edit`);
    await expect(intruder.getByText("Project not found")).toBeVisible();

    await intruder.goto("/projects");
    await expect(intruder.getByText("Private research")).toHaveCount(0);
    await expect(intruder.getByText("No projects yet")).toBeVisible();
    await other.close();

    // The owner's project is untouched.
    await page.goto(`/projects/${id}`);
    await expect(page.getByRole("heading", { level: 1, name: "Private research" })).toBeVisible();
  });
});
