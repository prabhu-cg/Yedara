import { expect, test } from "@playwright/test";
import { isCompactViewport, signUp } from "./helpers";

const GROUPS = ["Workspace", "Research tools", "Resources", "Account"];
const LINKS = [
  "Dashboard",
  "My Projects",
  "Research Planner",
  "Persona Builder",
  "Competitor Analyzer",
  "Journey Mapper",
  "Research Synthesizer",
  "Opportunity Analyzer",
  "Templates",
  "Settings",
];

test.describe("responsive navigation", () => {
  test.beforeEach(async ({ page }) => {
    await signUp(page);
  });

  test("shows the right navigation pattern for the viewport", async ({ page }) => {
    const compact = isCompactViewport(page);
    const menuButton = page.getByRole("button", { name: "Open navigation menu" });

    if (!compact) {
      await expect(menuButton).toBeHidden();
      const nav = page.getByRole("navigation", { name: "Main" });
      await expect(nav).toBeVisible();
      for (const group of GROUPS) await expect(nav.getByText(group, { exact: true })).toBeVisible();
      for (const link of LINKS) await expect(nav.getByRole("link", { name: new RegExp(`^${link}`) })).toBeVisible();
      // Billing is shown but not navigable until implemented.
      await expect(nav.getByText("Billing")).toBeVisible();
      await expect(nav.getByRole("link", { name: /Billing/ })).toHaveCount(0);
      await expect(nav.getByText("Billing").locator("..")).toHaveAttribute("aria-disabled", "true");
    } else {
      await expect(page.getByRole("navigation", { name: "Main" })).toBeHidden();
      await menuButton.click();
      const drawer = page.getByRole("dialog");
      await expect(drawer).toBeVisible();
      const nav = drawer.getByRole("navigation", { name: "Main" });
      for (const link of LINKS) await expect(nav.getByRole("link", { name: new RegExp(`^${link}`) })).toBeVisible();
      await expect(nav.getByRole("link", { name: /Billing/ })).toHaveCount(0);
    }
  });

  test("navigates and closes the drawer on small screens", async ({ page }) => {
    test.skip(!isCompactViewport(page), "drawer only exists below the lg breakpoint");
    await page.getByRole("button", { name: "Open navigation menu" }).click();
    await page.getByRole("dialog").getByRole("link", { name: /^My Projects/ }).click();
    await expect(page).toHaveURL(/\/projects$/);
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("closes the drawer with Escape and returns focus to the trigger", async ({ page }) => {
    test.skip(!isCompactViewport(page), "drawer only exists below the lg breakpoint");
    const trigger = page.getByRole("button", { name: "Open navigation menu" });
    await trigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("marks the current page in the navigation", async ({ page }) => {
    await page.goto("/tools/journey-mapper");
    if (isCompactViewport(page)) await page.getByRole("button", { name: "Open navigation menu" }).click();
    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link", { name: /^Journey Mapper/ })).toHaveAttribute("aria-current", "page");
    await expect(nav.getByRole("link", { name: /^Dashboard/ })).not.toHaveAttribute("aria-current", "page");
  });

  test("has no horizontal overflow on key pages", async ({ page }) => {
    for (const path of ["/dashboard", "/projects", "/projects/new", "/tools", "/settings/profile"]) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(0);
    }
  });

  test("every research tool has an entry point, and unfinished ones say so", async ({ page }) => {
    await page.goto("/tools");
    // Planner, personas and competitors are live; the other three are coming soon.
    await expect(page.getByText("Coming soon")).toHaveCount(3);
    for (const [slug, name] of [
      ["journey-mapper", "Journey Mapper"],
      ["research-synthesizer", "Research Synthesizer"],
      ["opportunity-analyzer", "Opportunity Analyzer"],
    ]) {
      await page.goto(`/tools/${slug}`);
      await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
      await expect(page.getByText(`${name} is on its way`)).toBeVisible();
    }
    for (const [slug, name] of [
      ["research-planner", "Research Planner"],
      ["persona-builder", "Persona Builder"],
      ["competitor-analyzer", "Competitor Analyzer"],
    ]) {
      await page.goto(`/tools/${slug}`);
      await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
      await expect(page.getByText("is on its way")).toHaveCount(0);
    }
    await page.goto("/tools/not-a-tool");
    await expect(page.getByRole("heading", { name: "This page didn't get a reply." })).toBeVisible();
    await expect(page.getByText("/tools/not-a-tool")).toBeVisible();
  });
});
