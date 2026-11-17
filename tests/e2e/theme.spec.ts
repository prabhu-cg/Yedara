import { expect, test, type Page } from "@playwright/test";
import { createProject, signUp } from "./helpers";

const LIGHT_BG = "rgb(255, 255, 255)";
const DARK_BG = "rgb(20, 19, 18)";
const AMBER = "rgb(232, 185, 35)";

const toggle = (page: Page) => page.getByRole("button", { name: "Dark theme" }).filter({ visible: true }).first();

test.describe("theme", () => {
  test("is light by default and ignores the system preference", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/login");
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await expect(page.locator("body")).toHaveCSS("background-color", LIGHT_BG);
  });

  test("flips between exactly two themes and remembers the choice", async ({ page }) => {
    await page.goto("/login");
    await expect(toggle(page)).toHaveAttribute("aria-pressed", "false");
    await toggle(page).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.locator("body")).toHaveCSS("background-color", DARK_BG);
    await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");

    // Persists across a reload and other pages, applied before first paint.
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.goto("/signup");
    await expect(page.locator("html")).toHaveClass(/dark/);

    await toggle(page).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await expect(page.evaluate(() => localStorage.getItem("yedara-theme"))).resolves.toBe("light");
  });

  test("there is no system option", async ({ page }) => {
    await page.goto("/login");
    await toggle(page).click();
    await expect(page.getByRole("menuitemradio")).toHaveCount(0);
    await expect(page.getByText("System", { exact: true })).toHaveCount(0);
  });

  test("works inside the signed-in app", async ({ page }) => {
    await signUp(page);
    await toggle(page).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.goto("/projects");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.locator("body")).toHaveCSS("background-color", DARK_BG);
    await toggle(page).click();
    await expect(page.locator("body")).toHaveCSS("background-color", LIGHT_BG);
  });
});

test.describe("shared visual language", () => {
  test("primary buttons are amber pills with charcoal text, and darken on hover where hover exists", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/login");
    const cta = page.getByRole("button", { name: "Sign in" });
    await expect(cta).toHaveCSS("background-color", AMBER);
    await expect(cta).toHaveCSS("color", "rgb(53, 51, 53)");
    await expect(cta).toHaveCSS("border-top-left-radius", /^(9999|3\.35544e\+07)px$/);
    await expect(cta).toHaveCSS("height", "40px");
    if ((page.viewportSize()?.width ?? 0) >= 1024) {
      await cta.hover();
      await expect(cta).toHaveCSS("background-color", "rgb(212, 166, 21)");
    }
  });

  test("the current sidebar item is butter: the accent tint with ochre text", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await signUp(page);
    test.skip((page.viewportSize()?.width ?? 0) < 1024, "the desktop sidebar is hidden below lg");
    const current = page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Dashboard" });
    await expect(current).toHaveAttribute("aria-current", "page");
    await expect(current).toHaveCSS("color", "rgb(130, 100, 0)");
    await expect(current).toHaveCSS("background-color", "rgb(250, 244, 223)");
    await expect(current).toHaveCSS("font-weight", "600");
    await expect(current).toHaveCSS("border-top-left-radius", /^(9999|3\.35544e\+07)px$/);
  });

  test("headings are Newsreader and the body is DM Sans", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCSS("font-family", /Newsreader/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCSS("font-weight", "500");
    await expect(page.locator("body")).toHaveCSS("font-family", /DM Sans/);
  });

  test("sign-in and sign-up are split screens with the brand panel on large screens", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    const wide = (page.viewportSize()?.width ?? 0) >= 1024;
    for (const path of ["/login", "/signup", "/forgot-password"]) {
      await page.goto(path);
      const panel = page.locator('img[src*="panel.jpg"]');
      if (wide) {
        await expect(panel).toBeVisible();
        const box = await panel.locator("..").boundingBox();
        const viewport = page.viewportSize()!.width;
        expect(box!.width / viewport).toBeGreaterThan(0.56);
        expect(box!.width / viewport).toBeLessThan(0.6);
        await expect(page.getByText("Good decisions start with better questions")).toBeVisible();
      } else {
        await expect(panel).toBeHidden();
      }
      // The form column is on the desk ground with the product mark above the form, at every size.
      await expect(page.getByRole("heading", { level: 1, name: "Yedara" })).toBeVisible();
      await expect(page.locator("main")).toHaveCSS("background-color", "rgb(252, 250, 243)");
    }
    await page.goto("/login");
    const card = page.getByLabel("Email").locator("xpath=ancestor::div[contains(@class,'rounded-card')][1]");
    await expect(card).toHaveCSS("border-top-left-radius", "20px");
  });

  test("inputs are 40px tall with an 8px radius", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/login");
    const input = page.getByLabel("Email");
    await expect(input).toHaveCSS("height", "40px");
    await expect(input).toHaveCSS("border-top-left-radius", "8px");
    await expect(page.getByRole("button", { name: "Sign in" })).toHaveCSS("height", "40px");
  });
});

test.describe("brand identity", () => {
  test("serves the logo as favicon, shortcut icon and touch icon: amber left wing, dark grey right wing", async ({ page, request }) => {
    await page.goto("/");
    await expect(page.locator('link[rel="icon"][href*="icon.svg"]')).toHaveCount(1);
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);

    const svg = await request.get("/icon.svg");
    expect(svg.status()).toBe(200);
    expect(svg.headers()["content-type"]).toContain("image/svg+xml");
    const text = await svg.text();
    expect(text).toContain("#E8B923");
    expect(text).toContain("#444444");
    expect(text).not.toContain("#C74504");

    const ico = await request.get("/favicon.ico");
    expect(ico.status()).toBe(200);
    expect((await ico.body()).subarray(0, 4)).toEqual(Buffer.from([0, 0, 1, 0]));
    expect((await request.get("/apple-icon.png")).status()).toBe(200);
  });

  test("shows the mark and the tagline on the landing page and sign-in", async ({ page }) => {
    await page.goto("/");
    const header = page.locator("header").first();
    await expect(header.getByRole("link", { name: "Yedara home" }).locator("svg path")).toHaveCount(2);
    await expect(page.locator("footer").getByText(/Know\. Explore\. Understand\./)).toBeVisible();

    await page.goto("/login");
    await expect(page.getByRole("heading", { level: 1, name: "Yedara" })).toBeVisible();
    await expect(page.locator("main").getByText("Know. Explore. Understand.")).toBeVisible();
  });

  test("the left wing is the CTA amber and the right wing dark grey, even when the stylesheet is stale or missing", async ({ page }) => {
    await page.route("**/*.css", (route) => route.abort());
    await page.goto("/");
    const wings = page.locator("header").first().getByRole("link", { name: "Yedara home" }).locator("svg path");
    await expect(wings).toHaveCount(2);
    await expect(wings.first()).toHaveCSS("fill", "rgb(68, 68, 68)");
    await expect(wings.nth(1)).toHaveCSS("fill", AMBER);
  });

  test("in dark mode the dark wing lightens so it stays visible, and the amber wing is unchanged", async ({ page }) => {
    await page.goto("/login");
    await toggle(page).click();
    const logoPaths = page.locator("main a[href='/'] svg path");
    await expect(logoPaths.first()).toHaveCSS("fill", "rgb(231, 224, 214)");
    await expect(logoPaths.nth(1)).toHaveCSS("fill", AMBER);
  });
});

test.describe("cards in the app", () => {
  const canHover = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1024;

  test("record cards use the 20px card radius, sit flat at rest, and take an amber border on hover", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await signUp(page);
    await createProject(page, { name: "Elevation project" });
    await page.goto("/projects");
    const card = page.getByRole("article").filter({ hasText: "Elevation project" });
    await expect(card).toHaveCSS("border-top-left-radius", "20px");
    await expect(card).toHaveCSS("border-top-color", "rgb(236, 229, 204)");
    await expect(card).toHaveCSS("box-shadow", "none");
    if (canHover(page)) {
      await card.hover();
      await expect(card).toHaveCSS("border-top-color", AMBER);
    }
    // Keyboard focus gets the same treatment as hover.
    await card.getByRole("link", { name: "Elevation project" }).focus();
    await expect(card).toHaveCSS("border-top-color", AMBER);
  });

  test("dark cards sit on the warm card ground", async ({ page }) => {
    await signUp(page);
    await createProject(page, { name: "Dark project" });
    await toggle(page).click();
    await page.goto("/projects");
    const card = page.getByRole("article").filter({ hasText: "Dark project" });
    await expect(card).toHaveCSS("background-color", "rgb(28, 27, 25)");
  });
});
