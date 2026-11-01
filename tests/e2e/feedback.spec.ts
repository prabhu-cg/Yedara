import { expect, test } from "@playwright/test";
import { signUp } from "./helpers";

test.describe("feedback widget", () => {
  test("is available inside the signed-in app and stays inside the viewport", async ({ page }) => {
    await signUp(page);
    await page.goto("/dashboard");
    const pill = page.getByRole("button", { name: "Feedback", exact: true });
    await expect(pill).toBeVisible();
    await pill.click();
    const dialog = page.getByRole("dialog", { name: "Send feedback" });
    await expect(dialog).toBeVisible();
    const box = (await dialog.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(pill).toBeFocused();
  });
});
