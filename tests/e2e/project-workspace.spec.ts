import { expect, test, type Page } from "@playwright/test";
import { createAnalysis, createPersona, createPlan, createProject, createProjectWithBrief, openNav, signUp } from "./helpers";

/** A project holding one plan, one persona and one analysis, oldest to newest. */
async function seed(page: Page, name = "Workspace project") {
  const projectId = await createProjectWithBrief(page, { name, product: "A budgeting app", audience: "Freelancers", objectives: "Learn why people churn" });
  await createPlan(page, { projectName: name, title: "Churn plan" });
  await createPersona(page, { name: "Freelance Fran", projectName: name });
  await createAnalysis(page, { title: "Rival scan", projectName: name });
  await page.goto(`/projects/${projectId}`);
  return projectId;
}

test.describe("project page", () => {
  test("research comes first, as cards that name their tool, and switches to a table with a Tool column", async ({ page }) => {
    await signUp(page);
    const projectId = await seed(page);
    const main = page.getByRole("main");

    // The work is the first thing under the header; there is no research-tools block at the bottom.
    await expect(main.getByRole("heading", { name: "Research" })).toBeVisible();
    await expect(main.getByRole("heading", { name: "Research tools" })).toHaveCount(0);
    const cards = main.locator("li[data-kind]");
    await expect(cards).toHaveCount(3);
    await expect(cards.filter({ hasText: "Churn plan" })).toContainText("Research plan");
    await expect(cards.filter({ hasText: "Freelance Fran" })).toContainText("Persona");
    await expect(cards.filter({ hasText: "Rival scan" })).toContainText("Competitor analysis");

    await main.getByRole("link", { name: "Table" }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}\\?view=table$`));
    const table = main.getByRole("table", { name: "Research in this project" });
    await expect(table.getByRole("columnheader", { name: "Tool" })).toBeVisible();
    const rows = table.locator("tbody tr");
    await expect(rows).toHaveCount(3);
    // Oldest first: the order the work was started in. Each row names its tool.
    await expect(rows.nth(0)).toContainText("Churn plan");
    await expect(rows.nth(2)).toContainText("Rival scan");
    await expect(rows.nth(2).locator("td").first()).toHaveText("Analysis");
    await expect(rows.filter({ hasText: "Freelance Fran" }).locator("td").first()).toHaveText("Persona");
    await expect(rows.filter({ hasText: "Churn plan" }).locator("td").first()).toHaveText("Plan");

    // A row opens its item, and its menu works from the table.
    await rows.filter({ hasText: "Churn plan" }).getByRole("link", { name: "Churn plan" }).click();
    await expect(page).toHaveURL(/\/tools\/research-planner\/[0-9a-f-]{36}$/);
  });

  test("filters by tool and keeps the chosen layout", async ({ page }) => {
    await signUp(page);
    const projectId = await seed(page);
    const main = page.getByRole("main");
    await page.goto(`/projects/${projectId}?view=table`);

    await main.getByRole("navigation", { name: "Filter by tool" }).getByRole("link", { name: /Personas/ }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}\\?view=table&type=persona$`));
    const rows = main.getByRole("table").locator("tbody tr");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Freelance Fran");

    await main.getByRole("navigation", { name: "Layout" }).getByRole("link", { name: "Cards" }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}\\?type=persona$`));
    await expect(main.locator("li[data-kind]")).toHaveCount(1);

    // Unknown values fall back to the defaults instead of breaking the page.
    await page.goto(`/projects/${projectId}?view=bogus&type=nope`);
    await expect(main.locator("li[data-kind]")).toHaveCount(3);
  });

  test("an empty project offers each tool, and the New menu opens the right drawer", async ({ page }) => {
    await signUp(page);
    const projectId = await createProject(page, { name: "Empty project" });
    const main = page.getByRole("main");
    await expect(main.getByText("No research in this project yet")).toBeVisible();
    await expect(main.getByRole("link", { name: "Persona" })).toBeVisible();
    // Filters and layout only appear once there is something to filter.
    await expect(main.getByRole("navigation", { name: "Layout" })).toHaveCount(0);

    await main.getByRole("button", { name: "New" }).first().click();
    await page.getByRole("menuitem", { name: "Persona" }).click();
    await expect(page.getByRole("dialog").getByRole("heading", { name: "New persona" })).toBeVisible();
    await expect(page.getByRole("dialog").getByLabel("Project")).toHaveValue(projectId);
  });

  test("project facts sit in one line and the brief is collapsed until opened", async ({ page }) => {
    await signUp(page);
    await seed(page);
    const main = page.getByRole("main");
    const facts = main.getByRole("term").filter({ hasText: "Project type" });
    await expect(facts).toHaveCount(1);
    // Only filled-in facts are listed: no client or industry was given.
    await expect(main.getByRole("term").filter({ hasText: "Client" })).toHaveCount(0);
    await expect(main.getByText("Freelancers")).toBeHidden();
    await main.getByText("Project brief").click();
    await expect(main.getByText("Freelancers")).toBeVisible();
    await expect(main.getByText("Learn why people churn")).toBeVisible();
  });

  test("fits the viewport in both layouts, with no sideways scroll on the page", async ({ page }) => {
    await signUp(page);
    const projectId = await seed(page);
    for (const query of ["", "?view=table"]) {
      await page.goto(`/projects/${projectId}${query}`);
      await expect(page.getByRole("main").getByRole("heading", { name: "Research" })).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    }
  });
});

test.describe("Recent page", () => {
  test("is in the Workspace group and lists every kind of work, newest first, grouped by day", async ({ page }) => {
    await signUp(page);
    await seed(page, "Recent project");
    await page.goto("/dashboard");

    const nav = await openNav(page);
    await expect(nav.getByRole("link", { name: "Recent", exact: true })).toBeVisible();
    // The sidebar stays short: no list of items in it any more.
    await expect(nav.getByRole("list", { name: "Recent" })).toHaveCount(0);
    await nav.getByRole("link", { name: "Recent", exact: true }).click();
    await expect(page).toHaveURL(/\/recent$/);
    await expect(page.getByRole("heading", { level: 1, name: "Recent" })).toBeVisible();

    const main = page.getByRole("main");
    await expect(main.getByText("Today", { exact: true })).toBeVisible();
    const rows = main.locator("tbody tr[data-kind]");
    await expect(rows).toHaveCount(4);
    await expect(rows.first()).toContainText("Rival scan");
    await expect(rows.filter({ hasText: "Freelance Fran" })).toHaveAttribute("data-kind", "persona");
    await expect(rows.filter({ hasText: "Churn plan" })).toHaveAttribute("data-kind", "plan");
    await expect(main.locator("tbody tr[data-kind=project]")).toContainText("Recent project");
    // Items open from here.
    await rows.filter({ hasText: "Freelance Fran" }).getByRole("link").click();
    await expect(page).toHaveURL(/\/tools\/persona-builder\/[0-9a-f-]{36}$/);
  });

  test("filters by type from the URL, and unknown types fall back to all", async ({ page }) => {
    await signUp(page);
    await seed(page, "Filter project");
    const main = page.getByRole("main");
    await page.goto("/recent");
    await main.getByRole("navigation", { name: "Filter by type" }).getByRole("link", { name: /Personas/ }).click();
    await expect(page).toHaveURL(/\/recent\?type=persona$/);
    await expect(main.locator("tbody tr[data-kind]")).toHaveCount(1);
    await expect(main.locator("tbody tr[data-kind]").first()).toContainText("Freelance Fran");

    await main.getByRole("navigation", { name: "Filter by type" }).getByRole("link", { name: /Projects/ }).click();
    await expect(main.locator("tbody tr[data-kind=project]")).toHaveCount(1);

    await page.goto("/recent?type=nope");
    await expect(main.locator("tbody tr[data-kind]")).toHaveCount(4);
  });

  test("says what it is for when empty, never shows another user's work, and fits the viewport", async ({ page, browser }) => {
    await signUp(page);
    await page.goto("/recent");
    await expect(page.getByText("Nothing here yet")).toBeVisible();

    await createProject(page, { name: "Private project" });
    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await signUp(otherPage);
    await otherPage.goto("/recent");
    await expect(otherPage.getByText("Private project")).toHaveCount(0);
    await other.close();

    await page.goto("/recent");
    await expect(page.getByRole("main").getByText("Private project")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("cards", () => {
  test("are one height per row, whatever their content", async ({ page }) => {
    await signUp(page);
    await seed(page);
    const cards = page.getByRole("main").locator("li[data-kind] article");
    await expect(cards).toHaveCount(3);
    const heights = await cards.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
    expect(heights).toHaveLength(3);
    if ((page.viewportSize()?.width ?? 1280) >= 1280) expect(new Set(heights).size).toBe(1);
  });

  test("use the vertical ellipsis for more actions", async ({ page }) => {
    await signUp(page);
    await seed(page);
    const icon = page.getByRole("main").getByRole("button", { name: "Actions for Churn plan" }).locator("svg");
    await expect(icon).toHaveClass(/lucide-ellipsis-vertical/);
  });
});
