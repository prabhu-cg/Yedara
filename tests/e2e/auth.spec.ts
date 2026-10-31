import { expect, test } from "@playwright/test";
import { PASSWORD, signUp, uniqueEmail, isCompactViewport } from "./helpers";

async function signOut(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Account menu" }).first().click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
}

test.describe("authentication", () => {
  test("signs up, lands on an onboarding dashboard and persists the session", async ({ page }) => {
    await signUp(page, { name: "Ada Lovelace" });
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Ada");
    await expect(page.getByText("You don't have any projects yet")).toBeVisible();

    // Session persists across a full reload.
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Ada");
  });

  test("logs out, then logs back in with the same credentials", async ({ page }) => {
    const { email } = await signUp(page);
    await signOut(page);

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("shows one generic error for wrong password", async ({ page }) => {
    const { email } = await signUp(page);
    await signOut(page);

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("wrong-Password1");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Invalid email or password." })).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel("Email").fill(uniqueEmail("ghost"));
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Invalid email or password." })).toBeVisible();
  });

  test("validates the login form before submitting", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Email is required")).toBeVisible();
    await expect(page.getByText("Password is required")).toBeVisible();

    await page.getByLabel("Email").fill("not-an-email");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Enter a valid email address")).toBeVisible();
  });

  test("validates the signup form", async ({ page }) => {
    await page.goto("/signup");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Your name is required")).toBeVisible();
    await expect(page.getByText("Email is required")).toBeVisible();

    await page.getByLabel("Full name").fill("Test");
    await page.getByLabel("Email").fill("t@example.com");
    await page.getByLabel("Password", { exact: true }).fill("short");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Use at least 8 characters")).toBeVisible();

    await page.getByLabel("Password", { exact: true }).fill("onlyletters");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Include at least one number")).toBeVisible();
    await expect(page).toHaveURL(/\/signup$/);
  });

  test("password reset request never reveals whether an account exists", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill(uniqueEmail("nobody"));
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText("If an account exists for that address")).toBeVisible();
  });

  test("toggles password visibility", async ({ page }) => {
    await page.goto("/login");
    const input = page.getByLabel("Password", { exact: true });
    await expect(input).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Show password" }).click();
    await expect(input).toHaveAttribute("type", "text");
  });

  test("redirects signed-in users away from auth pages", async ({ page }) => {
    await signUp(page);
    for (const path of ["/login", "/signup", "/forgot-password", "/"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/dashboard$/);
    }
  });

  test("changes the password from account settings", async ({ page }) => {
    const { email } = await signUp(page);
    await page.goto("/settings/account");
    await page.getByLabel("New password", { exact: true }).fill("An0therpass");
    await page.getByLabel("Confirm new password").fill("Mismatch123");
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByText("Passwords do not match")).toBeVisible();

    await page.getByLabel("Confirm new password").fill("An0therpass");
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByText("Password updated")).toBeVisible();

    await signOut(page);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("An0therpass");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("updates the profile name", async ({ page }) => {
    await signUp(page, { name: "Before Name" });
    await page.goto("/settings/profile");
    await page.getByLabel("Full name").fill("After Name");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Profile updated")).toBeVisible();
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("After");
    test.skip(isCompactViewport(page), "covered on desktop");
  });
});
