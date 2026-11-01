import { expect, test } from "@playwright/test";
import { PASSWORD, signUp, uniqueEmail } from "./helpers";

const PROTECTED = [
  "/dashboard",
  "/projects",
  "/projects/new",
  "/projects/00000000-0000-4000-8000-000000000000",
  "/tools",
  "/tools/journey-mapper",
  "/templates",
  "/settings",
  "/settings/profile",
  "/settings/account",
];

test.describe("protected routes", () => {
  for (const path of PROTECTED) {
    test(`redirects anonymous visitors from ${path} to login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path).replace(/\//g, "%2F")}$`));
    });
  }

  test("public pages render without a session", async ({ page }) => {
    for (const [path, heading] of [
      ["/", /Better insights/],
      ["/login", /Welcome back/],
      ["/signup", /Create your account/],
      ["/forgot-password", /Reset your password/],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: path === "/" ? 1 : undefined, name: heading }).first()).toBeVisible();
    }
  });

  test("returns the user to the page they asked for after logging in", async ({ page, browser }) => {
    const email = uniqueEmail();
    const setup = await browser.newPage();
    await signUp(setup, { email });
    await setup.context().close();

    await page.goto("/settings/account");
    await expect(page).toHaveURL(/\/login\?next=%2Fsettings%2Faccount$/);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/settings\/account$/);
  });

  test("ignores external or protocol-relative redirect targets", async ({ page, browser }) => {
    const email = uniqueEmail();
    const setup = await browser.newPage();
    await signUp(setup, { email });
    await setup.context().close();

    for (const next of ["//evil.example.com", "https://evil.example.com", "/\\evil.example.com"]) {
      await page.goto(`/login?next=${encodeURIComponent(next)}`);
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page).toHaveURL(/127\.0\.0\.1:3100\/dashboard$/);
      await page.context().clearCookies();
    }
  });

  test("an expired auth link sends the user to a clear message", async ({ page }) => {
    await page.goto("/auth/callback?code=bogus&next=/reset-password");
    await expect(page).toHaveURL(/\/login\?error=link_expired$/);
    await expect(page.getByRole("alert").filter({ hasText: "expired" })).toBeVisible();
  });

  test("reset-password page without a session explains the link has expired", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(page.getByRole("heading", { name: "This link has expired" })).toBeVisible();
  });
});
