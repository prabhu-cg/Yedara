import { expect, test } from "@playwright/test";
import { createAnalysis, createJourney, createPersona, createPlan, createProject, createSynthesis, signUp } from "./helpers";

const PROJECT = "Parent project";

test.describe("every tool page shows its parent project and links back to it", () => {
  test("plan, persona, analysis, synthesis and journey each carry a project link", async ({ page }) => {
    await signUp(page);
    const projectId = await createProject(page, { name: PROJECT });

    const pages: [string, () => Promise<string>][] = [
      ["research plan", () => createPlan(page, { projectName: PROJECT, title: "Plan A" })],
      ["persona", () => createPersona(page, { name: "Maya", projectName: PROJECT })],
      ["competitor analysis", () => createAnalysis(page, { title: "Analysis A", projectName: PROJECT })],
      ["research synthesis", () => createSynthesis(page, { title: "Synthesis A", projectName: PROJECT })],
      ["journey map", () => createJourney(page, { name: "Journey A", projectName: PROJECT })],
    ];

    for (const [name, create] of pages) {
      await create();
      const chip = page.getByRole("link", { name: new RegExp(`Project\\s*${PROJECT}`) });
      await expect(chip, `${name} shows its project`).toBeVisible();
      await expect(chip).toHaveAttribute("href", `/projects/${projectId}`);
    }

    // And the chip really goes back to the project.
    await page.getByRole("link", { name: new RegExp(`Project\\s*${PROJECT}`) }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}$`));
    await expect(page.getByRole("heading", { level: 1, name: PROJECT })).toBeVisible();
  });
});
