import { expect, test, type Page } from "@playwright/test";
import { createProject, signUp } from "./helpers";

const LIGHT_BG = "rgb(255, 255, 255)";
const DARK_BG = "rgb(18, 16, 14)";

async function chooseTheme(page: Page, name: "Light" | "Dark" | "System") {
  const trigger = page.getByRole("button", { name: "Change theme" }).filter({ visible: true }).first();
  const item = page.getByRole("menuitemradio", { name });
  await expect(async () => {
    if (!(await item.isVisible())) await trigger.click();
    await expect(item).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 10_000 });
  await item.click();
}

test.describe("theme", () => {
  test("follows the system preference until the user chooses", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.locator("body")).toHaveCSS("background-color", DARK_BG);

    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/login");
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  test("lets the user pick Light, Dark or System and remembers the choice", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await expect(page.locator("body")).toHaveCSS("background-color", LIGHT_BG);

    await chooseTheme(page, "Dark");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.locator("body")).toHaveCSS("background-color", DARK_BG);

    // Persists across a reload and other pages, with the theme applied before first paint.
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.goto("/signup");
    await expect(page.locator("html")).toHaveClass(/dark/);

    // An explicit choice beats the system preference.
    await page.emulateMedia({ colorScheme: "dark" });
    await chooseTheme(page, "Light");
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator("html")).not.toHaveClass(/dark/);

    // Back to System: follows the OS again.
    await chooseTheme(page, "System");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.evaluate(() => localStorage.getItem("yedara-theme"))).resolves.toBeNull();
  });

  test("the choice is marked in the menu", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await chooseTheme(page, "Dark");
    await page.getByRole("button", { name: "Change theme" }).filter({ visible: true }).first().click();
    await expect(page.getByRole("menuitemradio", { name: "Dark" })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("menuitemradio", { name: "Light" })).toHaveAttribute("aria-checked", "false");
  });

  test("works inside the signed-in app", async ({ page }) => {
    await signUp(page);
    await chooseTheme(page, "Dark");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.goto("/projects");
    await expect(page.locator("html")).toHaveClass(/dark/);
    // Sidebar / header grounds follow the theme; nothing is left white.
    await expect(page.locator("body")).toHaveCSS("background-color", DARK_BG);
    await chooseTheme(page, "Light");
    await expect(page.locator("body")).toHaveCSS("background-color", LIGHT_BG);
  });
});

test.describe("shared visual language", () => {
  test("the landing page uses Doxa's 1152px frame and a plain white hero", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    for (const selector of ["header > div", "main section >> nth=0 >> div", "footer > div"]) {
      await expect(page.locator(selector).first()).toHaveCSS("max-width", "1152px");
    }
    // No tinted masthead: the hero sits on the page background.
    await expect(page.locator("main section").first()).toHaveCSS("background-color", "rgb(255, 255, 255)");
    // Sticky header with a hairline, like Doxa's marketing site.
    await expect(page.locator("header").first()).toHaveCSS("position", "sticky");
    await expect(page.locator("header").first()).toHaveCSS("border-bottom-width", "1px");
  });

  test("landing tool cards: Doxa's 8.4px radius, resting elevation, and a brand border with raised shadow on hover", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    const card = page.getByRole("link", { name: /Research Planner/ }).first();
    await expect(card).toHaveCSS("border-top-left-radius", "8.4px");
    await expect(card).toHaveCSS("background-color", "rgb(255, 255, 255)");
    const resting = await card.evaluate((el) => getComputedStyle(el).boxShadow);
    expect(resting).not.toBe("none");
    if ((page.viewportSize()?.width ?? 0) >= 1024) {
      await card.hover();
      await expect(card).toHaveCSS("border-top-color", "rgb(199, 69, 4)");
      await expect.poll(() => card.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe(resting);
    }
  });

  test("primary buttons use the accent, and darken to the deep terracotta on hover where hover exists", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    const cta = page.getByRole("link", { name: /Create your workspace/ });
    await expect(cta).toHaveCSS("background-color", "rgb(199, 69, 4)");
    await expect(cta).toHaveCSS("border-top-left-radius", "6px");
    await expect(cta).toHaveCSS("height", "40px");
    // Tailwind only applies hover styles on devices that can hover, so check it on desktop.
    if ((page.viewportSize()?.width ?? 0) >= 1024) {
      await cta.hover();
      await expect(cta).toHaveCSS("background-color", "rgb(169, 58, 3)");
    }
  });

  test("the current sidebar item is a quiet wash, not an accent tint", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await signUp(page);
    test.skip((page.viewportSize()?.width ?? 0) < 1024, "the desktop sidebar is hidden below lg");
    const current = page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Dashboard" });
    await expect(current).toHaveAttribute("aria-current", "page");
    await expect(current).toHaveCSS("color", "rgb(28, 25, 23)");
    await expect(current).not.toHaveCSS("background-color", "rgb(253, 239, 231)");
    await expect(current).toHaveCSS("font-weight", "600");
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
      // The form column is on the Oat ground with the product mark above the form, at every size.
      await expect(page.getByRole("heading", { level: 1, name: "Yedara" })).toBeVisible();
      await expect(page.locator("main")).toHaveCSS("background-color", "rgb(244, 242, 234)");
    }
    await page.goto("/login");
    const card = page.getByLabel("Email").locator("xpath=ancestor::div[contains(@class,'rounded-2xl')][1]");
    await expect(card).toHaveCSS("border-top-left-radius", "10.8px");
  });

  test("controls are 36px tall with a 6px radius", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/login");
    const input = page.getByLabel("Email");
    await expect(input).toHaveCSS("height", "36px");
    await expect(input).toHaveCSS("border-top-left-radius", "6px");
    await expect(page.getByRole("button", { name: "Sign in" })).toHaveCSS("height", "36px");
  });
});

test.describe("brand identity", () => {
  test("serves the logo as favicon, shortcut icon and touch icon", async ({ page, request }) => {
    await page.goto("/");
    await expect(page.locator('link[rel="icon"][href*="icon.svg"]')).toHaveCount(1);
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);

    const svg = await request.get("/icon.svg");
    expect(svg.status()).toBe(200);
    expect(svg.headers()["content-type"]).toContain("image/svg+xml");
    expect(await svg.text()).toContain("#C74504");

    const ico = await request.get("/favicon.ico");
    expect(ico.status()).toBe(200);
    expect((await ico.body()).subarray(0, 4)).toEqual(Buffer.from([0, 0, 1, 0]));
    expect((await request.get("/apple-icon.png")).status()).toBe(200);
  });

  test("shows the mark and the tagline on the landing page and sign-in", async ({ page }) => {
    await page.goto("/");
    const header = page.locator("header").first();
    await expect(header.getByRole("link", { name: "Yedara home" }).locator("svg path")).toHaveCount(2);
    await expect(header.getByText("Know. Explore. Understand.")).toBeVisible();
    await expect(page.locator("footer").getByText(/Know\. Explore\. Understand\./)).toBeVisible();

    await page.goto("/login");
    await expect(page.getByRole("heading", { level: 1, name: "Yedara" })).toBeVisible();
    await expect(page.locator("main").getByText("Know. Explore. Understand.")).toBeVisible();
  });

  test("both wings still draw when the stylesheet is stale or missing", async ({ page }) => {
    // Regression: the grey wing was coloured only by a generated class, so a stale stylesheet made it invisible.
    await page.route("**/*.css", (route) => route.abort());
    await page.goto("/");
    const wings = page.locator("header").first().getByRole("link", { name: "Yedara home" }).locator("svg path");
    await expect(wings).toHaveCount(2);
    await expect(wings.first()).toHaveCSS("fill", "rgb(68, 68, 68)");
    await expect(wings.nth(1)).toHaveCSS("fill", "rgb(199, 69, 4)");
  });

  test("the mark's dark wing lightens in dark mode so it stays visible", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    const logoPaths = page.locator("header").first().getByRole("link", { name: "Yedara home" }).locator("svg path");
    const wing = logoPaths.first();
    await expect(wing).toHaveCSS("fill", "rgb(68, 68, 68)");
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(logoPaths.first()).toHaveCSS("fill", "rgb(231, 224, 214)");
    await expect(logoPaths.nth(1)).toHaveCSS("fill", "rgb(199, 69, 4)");
  });
});

test.describe("cards in the app", () => {
  const shadowOf = (loc: import("@playwright/test").Locator) => loc.evaluate((el) => getComputedStyle(el).boxShadow);
  const canHover = (page: import("@playwright/test").Page) => (page.viewportSize()?.width ?? 0) >= 1024;

  test("record cards use the 16px card radius, rest on a shadow, and lift with a brand border on hover", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await signUp(page);
    await createProject(page, { name: "Elevation project" });
    await page.goto("/projects");
    const card = page.getByRole("article").filter({ hasText: "Elevation project" });
    await expect(card).toHaveCSS("border-top-left-radius", "16px");
    await expect(card).toHaveCSS("border-top-color", "rgb(232, 221, 200)");
    const resting = await shadowOf(card);
    expect(resting).not.toBe("none");
    if (canHover(page)) {
      await card.hover();
      await expect(card).toHaveCSS("border-top-color", "rgb(199, 69, 4)");
      await expect.poll(() => shadowOf(card)).not.toBe(resting);
    }
    // Keyboard focus gets the same treatment as hover.
    await card.getByRole("link", { name: "Elevation project" }).focus();
    await expect(card).toHaveCSS("border-top-color", "rgb(199, 69, 4)");
  });

  test("tiles use the 8.4px radius, and static cards the 16px radius with a resting shadow", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await signUp(page);
    await createProject(page, { name: "Tiles project" });
    await page.goto("/dashboard");
    const tool = page.getByRole("link", { name: /Persona Builder/ }).last();
    await expect(tool).toHaveCSS("border-top-left-radius", "8.4px");
    expect(await shadowOf(tool)).not.toBe("none");
    const statusTile = page.getByRole("link", { name: /Planning\s*1/ });
    await expect(statusTile).toHaveCSS("border-top-left-radius", "8.4px");
    if (canHover(page)) {
      await tool.hover();
      await expect(tool).toHaveCSS("border-top-color", "rgb(199, 69, 4)");
    }

    await page.goto("/settings/profile");
    const card = page.locator("main .rounded-card").first();
    await expect(card).toHaveCSS("border-top-left-radius", "16px");
    expect(await shadowOf(card)).not.toBe("none");
  });

  test("elevation also shows in dark mode and cards keep their brand hover", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await signUp(page);
    await createProject(page, { name: "Dark project" });
    await page.goto("/projects");
    const card = page.getByRole("article").filter({ hasText: "Dark project" });
    await expect(card).toHaveCSS("background-color", "rgb(28, 25, 22)");
    expect(await shadowOf(card)).not.toBe("none");
    if (canHover(page)) {
      await card.hover();
      await expect(card).toHaveCSS("border-top-color", "rgb(199, 69, 4)");
    }
  });
});
