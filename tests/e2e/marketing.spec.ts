import { expect, test } from "@playwright/test";

const PAGES: [string, RegExp][] = [
  ["/", /Better insights\./],
  ["/features", /Everything in the workspace/],
  ["/pricing", /Free today\. Pro when it/],
  ["/about", /Research is only useful/],
  ["/contact", /Tell us what you/],
  ["/privacy", /Privacy policy/],
  ["/terms", /Terms of service/],
];

test.describe("marketing site", () => {
  for (const [path, heading] of PAGES) {
    test(`${path} renders without a session, has one h1, and does not overflow`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      await expect(page.locator("head link[rel=canonical]")).toHaveCount(path === "/" ? 1 : 1);
      await expect(page.locator('head meta[property="og:title"]')).toHaveCount(1);
    });
  }

  test("the header and CTAs lead to real destinations", async ({ page }) => {
    await page.goto("/");
    const mobile = (page.viewportSize()?.width ?? 0) < 768;
    if (mobile) await page.getByRole("button", { name: "Open menu" }).click();
    const nav = page.getByRole("navigation", { name: "Primary" }).filter({ visible: true });
    await nav.getByRole("link", { name: "Pricing" }).click();
    await expect(page).toHaveURL(/\/pricing$/);

    await page.getByRole("link", { name: "Create a free account" }).click();
    await expect(page).toHaveURL(/\/signup$/);
    await expect(page.getByRole("heading", { name: /Create your account/ }).first()).toBeVisible();

    await page.goto("/pricing");
    await page.getByRole("link", { name: "Tell us what you'd want" }).click();
    await expect(page).toHaveURL(/\/contact\?topic=pro$/);
    await expect(page.getByLabel("What is this about?")).toHaveValue("pro");
  });

  test("every internal link on the homepage resolves", async ({ page, request }) => {
    await page.goto("/");
    const hrefs = await page.locator("a[href^='/']").evaluateAll((links) => [...new Set(links.map((a) => (a as HTMLAnchorElement).getAttribute("href")!.split("#")[0]))]);
    for (const href of hrefs.filter(Boolean)) {
      const response = await request.get(href, { maxRedirects: 0 });
      expect(response.status(), href).toBeLessThan(400);
    }
  });

  test("the mobile menu opens, closes on Escape and is keyboard reachable", async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) >= 768, "desktop shows the full navigation");
    await page.goto("/");
    const button = page.getByRole("button", { name: "Open menu" });
    await button.click();
    await expect(page.locator("#mobile-menu")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#mobile-menu")).toHaveCount(0);
  });

  test("the FAQ opens with the keyboard", async ({ page }) => {
    await page.goto("/");
    const summary = page.locator("summary", { hasText: "Is it free?" });
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText(/no payment step\./).first()).toBeVisible();
  });

  test("the contact form validates on the server-side schema and shows field errors", async ({ page }) => {
    await page.goto("/contact");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByText("Enter your name.")).toBeVisible();
    await expect(page.getByText("Write at least a sentence so we can help.")).toBeVisible();
  });

  test("a valid contact message is accepted", async ({ page }) => {
    await page.goto("/contact");
    await page.getByLabel("Name").fill("Sam Tester");
    await page.getByLabel("Email").fill("sam@example.com");
    await page.getByLabel("Message").fill("How do I export a synthesis report to Word?");
    await page.waitForTimeout(3200); // the minimum fill time
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("status")).toContainText("Message sent.");
  });

  test("has light and dark themes, switchable from the header", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    const marketing = page.locator(".marketing").first();
    await expect(marketing).toHaveCSS("background-color", "rgb(255, 255, 255)");
    if ((page.viewportSize()?.width ?? 0) < 768) await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("button", { name: "Change theme" }).filter({ visible: true }).first().click();
    await page.getByRole("menuitemradio", { name: "Dark" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(marketing).toHaveCSS("background-color", "rgb(18, 16, 14)");
    await page.reload();
    await expect(marketing).toHaveCSS("background-color", "rgb(18, 16, 14)");
  });

  test("serves sitemap.xml, robots.txt and a social card", async ({ request }) => {
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    const xml = await sitemap.text();
    for (const path of ["/features", "/pricing", "/about", "/contact", "/privacy", "/terms"]) expect(xml).toContain(path);
    const robots = await request.get("/robots.txt");
    expect(await robots.text()).toMatch(/Disallow: \/dashboard/);
    const home = await request.get("/");
    const ogPath = new URL((await home.text()).match(/property="og:image" content="([^"]+)"/)![1]).pathname;
    const og = await request.get(ogPath);
    expect(og.status()).toBe(200);
    expect(og.headers()["content-type"]).toContain("image/png");
  });
});
