import { expect, test, type Page } from "@playwright/test";
import { addJourneyItem, addObservation, addStage, createJourney, createPersona, createProject, createProjectWithBrief, createSynthesis, signUp } from "./helpers";

const stageNames = (page: Page) => page.getByRole("textbox", { name: /^Name of stage \d+$/ });
const tab = (page: Page, name: string) => page.getByRole("tab", { name });

async function setup(page: Page, options: { persona?: string; state?: "Current state" | "Future state" } = {}) {
  await signUp(page);
  await createProject(page, { name: "Budgeto" });
  if (options.persona) await createPersona(page, { name: options.persona, projectName: "Budgeto" });
  return createJourney(page, { name: "First week with Budgeto", projectName: "Budgeto", ...options });
}

/** A journey with three stages, items and emotions, ready to be viewed. */
async function mapped(page: Page) {
  const id = await setup(page);
  for (const name of ["Discover", "Sign up", "First task"]) await addStage(page, name);
  await addJourneyItem(page, "Discover", "User actions", "Searches for budgeting apps");
  await addJourneyItem(page, "Discover", "Thoughts", "Is this worth paying for?");
  await addJourneyItem(page, "Discover", "Touchpoints", "App store listing");
  await addJourneyItem(page, "Discover", "Channels", "Mobile web");
  await addJourneyItem(page, "Discover", "User goals", "Find a simple way to track spending");
  await addJourneyItem(page, "Sign up", "Pain points", "Bank linking takes too long");
  await addJourneyItem(page, "Sign up", "Opportunities", "Offer manual entry first");
  await addJourneyItem(page, "First task", "Supporting evidence", "Interview P2");
  const setEmotion = async (stage: string, label: string) => page.getByRole("region", { name: new RegExp(`^Stage \\d+: ${stage}$`) }).getByRole("radiogroup").getByRole("radio", { name: label, exact: true }).click();
  await setEmotion("Discover", "Positive");
  await setEmotion("Sign up", "Negative");
  // "First task" stays unrated on purpose.
  await expect(page.locator("[data-save-status]")).toHaveAttribute("data-save-status", "saved", { timeout: 10_000 });
  return id;
}

test.describe("journey mapper: creating", () => {
  test("offers the persona of the chosen project and records type, state and scenario", async ({ page }) => {
    await signUp(page);
    await createProject(page, { name: "Budgeto" });
    await createProject(page, { name: "Other project" });
    await createPersona(page, { name: "Maya the freelancer", projectName: "Budgeto" });

    await page.goto("/tools/journey-mapper/new");
    await expect(page.getByRole("combobox", { name: "Persona" })).toBeDisabled();
    await page.getByRole("combobox", { name: "Project" }).selectOption({ label: "Other project" });
    await expect(page.getByText("This project has no personas yet.")).toBeVisible();
    await page.getByRole("combobox", { name: "Project" }).selectOption({ label: "Budgeto" });
    await expect(page.getByRole("combobox", { name: "Persona" }).getByRole("option", { name: "Maya the freelancer" })).toHaveCount(1);

    await page.getByLabel("Journey name").fill("Invoicing for the first time");
    await page.getByRole("combobox", { name: "Persona" }).selectOption({ label: "Maya the freelancer" });
    await page.getByRole("combobox", { name: "Journey type" }).selectOption({ label: "Service journey" });
    await page.getByRole("combobox", { name: "State" }).selectOption({ label: "Future state" });
    await page.getByLabel("Scenario").fill("A freelancer sends their first invoice");
    await page.getByRole("button", { name: "Start mapping" }).click();

    await expect(page).toHaveURL(/\/tools\/journey-mapper\/[0-9a-f-]{36}(\?.*)?$/);
    await expect(page.getByRole("textbox", { name: "Journey name" })).toHaveValue("Invoicing for the first time");
    const header = page.getByRole("main");
    await expect(header).toContainText("Future state");
    await expect(header).toContainText("Service journey");
    await expect(header).toContainText("Persona: Maya the freelancer");
    await page.getByText("Journey details").click();
    await expect(page.getByLabel("Scenario")).toHaveValue("A freelancer sends their first invoice");
  });

  test("needs a name and a project", async ({ page }) => {
    await signUp(page);
    await createProject(page, { name: "Budgeto" });
    await page.goto("/tools/journey-mapper/new");
    await page.getByRole("button", { name: "Start mapping" }).click();
    await expect(page.getByText("Give the journey a name")).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "Choose a project" })).toBeVisible();
  });

  test("shows a prompt to create a project first when there are none", async ({ page }) => {
    await signUp(page);
    await page.goto("/tools/journey-mapper/new");
    await expect(page.getByText("Create a project first")).toBeVisible();
  });
});

test.describe("journey mapper: stages", () => {
  test("adds, renames, reorders and deletes stages, and keeps them", async ({ page }) => {
    await setup(page);
    await expect(page.getByText("No stages yet")).toBeVisible();
    await addStage(page, "Discover");
    await addStage(page, "Sign up");
    await page.getByRole("button", { name: "Add suggested stage Awareness" }).click();
    await expect(stageNames(page)).toHaveCount(3);
    await expect(page.getByRole("button", { name: "Add suggested stage Awareness" })).toHaveCount(0);

    await stageNames(page).nth(0).fill("Find it");
    await page.getByRole("button", { name: "Move stage Awareness earlier" }).click();
    await expect(stageNames(page).nth(1)).toHaveValue("Awareness");
    await expect(stageNames(page).nth(2)).toHaveValue("Sign up");
    await page.getByRole("button", { name: "Move stage Find it later" }).click();
    await expect(stageNames(page).nth(0)).toHaveValue("Awareness");
    await expect(page.locator("[data-save-status]")).toHaveAttribute("data-save-status", "saved", { timeout: 10_000 });

    await page.reload();
    await expect(stageNames(page)).toHaveCount(3);
    const values = await stageNames(page).evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
    expect(values).toEqual(["Awareness", "Find it", "Sign up"]);

    await page.getByRole("button", { name: "Delete stage Sign up" }).click();
    await expect(page.getByRole("alertdialog")).toContainText("Sign up");
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete stage" }).click();
    await expect(stageNames(page)).toHaveCount(2);
    await page.reload();
    await expect(stageNames(page)).toHaveCount(2);
  });

  test("an empty stage name is flagged and never saved", async ({ page }) => {
    await setup(page);
    await addStage(page, "Discover");
    await stageNames(page).first().fill("");
    await expect(page.getByText("Name the stage. It isn't saved while the name is empty.")).toBeVisible();
    await page.waitForTimeout(1500);
    await page.reload();
    await expect(stageNames(page).first()).toHaveValue("Discover");
  });

  test("caps a journey at 20 stages", async ({ page }) => {
    await setup(page);
    for (let i = 1; i <= 20; i++) await addStage(page, `S${i}`);
    await expect(page.getByRole("button", { name: "Add stage", exact: true })).toBeDisabled({ timeout: 2000 }).catch(() => {});
    await page.getByLabel("New stage name").fill("One too many");
    await page.getByRole("button", { name: "Add stage", exact: true }).click({ force: true });
    await expect(stageNames(page)).toHaveCount(20);
  });

  test("rates how the person feels at each stage, or leaves it unrated", async ({ page }) => {
    await setup(page);
    await addStage(page, "Discover");
    const group = page.getByRole("radiogroup", { name: "Emotion at Discover" });
    await expect(group.getByRole("radio", { name: "Not rated" })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByText("Left unrated, the stage is skipped on the emotion curve rather than counted as neutral.")).toBeVisible();
    await group.getByRole("radio", { name: "Very negative" }).click();
    await page.getByLabel("Emotion note for Discover").fill("Overwhelmed by choices");
    await expect(page.locator("[data-save-status]")).toHaveAttribute("data-save-status", "saved", { timeout: 10_000 });
    await page.reload();
    await expect(page.getByRole("radiogroup", { name: "Emotion at Discover" }).getByRole("radio", { name: "Very negative" })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByLabel("Emotion note for Discover")).toHaveValue("Overwhelmed by choices");
    await page.getByRole("radiogroup", { name: "Emotion at Discover" }).getByRole("radio", { name: "Not rated" }).click();
    await expect(page.locator("[data-save-status]")).toHaveAttribute("data-save-status", "saved", { timeout: 10_000 });
    await page.reload();
    await expect(page.getByRole("radiogroup", { name: "Emotion at Discover" }).getByRole("radio", { name: "Not rated" })).toHaveAttribute("aria-checked", "true");
  });
});

test.describe("journey mapper: items", () => {
  test("holds every kind of item, edits them, and deletes them", async ({ page }) => {
    await setup(page);
    await addStage(page, "Discover");
    const kinds: [string, string][] = [["User actions", "Searches online"], ["User goals", "Find a simple tool"], ["Thoughts", "Is this worth it?"], ["Touchpoints", "App store"], ["Channels", "Mobile web"], ["Pain points", "Too many choices"], ["Opportunities", "Offer a quiz"], ["Supporting evidence", "Interview P1"]];
    for (const [group, text] of kinds) await addJourneyItem(page, "Discover", group, text);

    const action = page.getByRole("textbox", { name: /^Action: Searches online/ });
    await action.fill("Searches online for an hour");
    await expect(page.locator("[data-save-status]")).toHaveAttribute("data-save-status", "saved", { timeout: 10_000 });
    await page.reload();
    await expect(page.getByRole("textbox", { name: /^Action: Searches online for an hour/ })).toBeVisible();
    for (const [, text] of kinds.slice(1)) await expect(page.getByRole("textbox", { name: new RegExp(`^[A-Za-z ]+: ${text.slice(0, 20).replace(/[?]/g, "\\?")}`) })).toBeVisible();

    await page.getByRole("button", { name: /^Delete action Searches online/ }).click();
    await expect(page.getByRole("textbox", { name: /^Action:/ })).toHaveCount(0);
  });

  test("won't add an empty item", async ({ page }) => {
    await setup(page);
    await addStage(page, "Discover");
    const group = page.getByRole("group", { name: "User actions for Discover" });
    await expect(group.getByRole("button", { name: /confirm$/ })).toBeDisabled();
    await group.getByRole("textbox", { name: /^Add / }).fill("   ");
    await expect(group.getByRole("button", { name: /confirm$/ })).toBeDisabled();
  });
});

test.describe("journey mapper: views", () => {
  test("the visual map shows stages left to right with every row and the emotion curve", async ({ page }) => {
    const id = await mapped(page);
    await page.goto(`/tools/journey-mapper/${id}`);
    await expect(tab(page, "Visual map")).toHaveAttribute("aria-selected", "true");
    const map = page.getByRole("region", { name: "Journey map" });
    const headings = await map.getByRole("columnheader").allInnerTexts();
    expect(headings.slice(1).map((h) => h.replace(/\s+/g, " "))).toEqual(["Stage 1 Discover", "Stage 2 Sign up", "Stage 3 First task"]);
    for (const row of ["User actions", "User goals", "Thoughts", "Emotion", "Emotion curve", "Touchpoints", "Channels", "Pain points", "Opportunities", "Supporting evidence"]) {
      await expect(map.getByRole("rowheader", { name: row, exact: true })).toBeVisible();
    }
    await expect(map.locator('[data-row="action"]')).toContainText("Searches for budgeting apps");
    await expect(map.locator('[data-row="pain_point"]')).toContainText("Bank linking takes too long");
    await expect(map.locator('[data-row="opportunity"]')).toContainText("Offer manual entry first");
    await expect(map.locator('[data-row="emotion"]')).toContainText("Positive");
    await expect(map.locator('[data-row="emotion"]')).toContainText("Negative");
    await expect(map.locator('[data-row="emotion"]')).toContainText("Not rated");

    // The curve has a point for each rated stage and none for the unrated one.
    const curve = map.getByRole("img", { name: /Emotion curve/ });
    await expect(curve.locator("circle")).toHaveCount(2);
    await expect(curve).toHaveAttribute("aria-label", /First task: Not rated/);
    // It is optional.
    await page.getByLabel("Show emotion curve").uncheck();
    await expect(map.getByRole("img", { name: /Emotion curve/ })).toHaveCount(0);
    await page.getByLabel("Show emotion curve").check();
    await expect(map.getByRole("img", { name: /Emotion curve/ })).toHaveCount(1);
  });

  test("the structured table has a row per stage and a column per element", async ({ page }) => {
    const id = await mapped(page);
    await page.goto(`/tools/journey-mapper/${id}`);
    await tab(page, "Structured table").click();
    const table = page.getByRole("region", { name: "Journey table" });
    const headers = await table.getByRole("columnheader").allInnerTexts();
    expect(headers).toEqual(["Stage", "Emotion", "User actions", "User goals", "Thoughts", "Touchpoints", "Channels", "Pain points", "Opportunities", "Supporting evidence"]);
    const rows = table.locator("tbody tr");
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText("Searches for budgeting apps");
    await expect(rows.nth(1)).toContainText("Bank linking takes too long");
    await expect(rows.nth(2)).toContainText("Interview P2");
    await expect(rows.nth(2)).toContainText("Not rated");
  });

  test("the presentation steps through an overview and each stage, with the keyboard", async ({ page }) => {
    const id = await mapped(page);
    await page.goto(`/tools/journey-mapper/${id}`);
    await tab(page, "Presentation").click();
    const slides = page.getByRole("region", { name: "Journey presentation" });
    await expect(slides).toContainText("Overview");
    await expect(slides.getByRole("heading", { level: 2, name: "First week with Budgeto" })).toBeVisible();
    await expect(slides.getByRole("button", { name: "Previous" })).toBeDisabled();

    await slides.getByRole("button", { name: "Next" }).click();
    await expect(slides).toContainText("Stage 1 of 3");
    await expect(slides.getByRole("heading", { level: 2, name: "Discover" })).toBeVisible();
    await expect(slides).toContainText("Searches for budgeting apps");
    await slides.focus();
    await page.keyboard.press("ArrowRight");
    await expect(slides.getByRole("heading", { level: 2, name: "Sign up" })).toBeVisible();
    await expect(slides).toContainText("Bank linking takes too long");
    await page.keyboard.press("End");
    await expect(slides.getByRole("heading", { level: 2, name: "First task" })).toBeVisible();
    await expect(slides.getByRole("button", { name: "Next" })).toBeDisabled();
    await page.keyboard.press("Home");
    await expect(slides).toContainText("Overview");
  });

  test("an empty journey explains itself in each view", async ({ page }) => {
    await setup(page);
    for (const name of ["Visual map", "Structured table", "Presentation"]) {
      await tab(page, name).click();
      await expect(page.getByText("This journey has no stages yet.")).toBeVisible();
    }
  });

  test("the map scrolls sideways inside its frame instead of squeezing, and the page never scrolls sideways", async ({ page }) => {
    const id = await mapped(page);
    await addStage(page, "Fourth");
    await addStage(page, "Fifth");
    await page.goto(`/tools/journey-mapper/${id}`);
    const map = page.getByRole("region", { name: "Journey map" });
    await expect(map).toBeVisible();
    const m = await map.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
    expect(m.scroll).toBeGreaterThan(m.client);
    // Columns keep a readable width.
    const first = await map.getByRole("columnheader").nth(1).boundingBox();
    expect(first!.width).toBeGreaterThanOrEqual(250);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    await map.evaluate((el) => { el.scrollLeft = 400; });
    expect(await map.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  });

  test("every view fits the viewport", async ({ page }) => {
    const id = await mapped(page);
    await page.goto(`/tools/journey-mapper/${id}`);
    for (const name of ["Visual map", "Structured table", "Presentation", "Edit stages", "Opportunities"]) {
      await tab(page, name).click();
      await expect(tab(page, name)).toHaveAttribute("aria-selected", "true");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `overflow on ${name}`).toBeLessThanOrEqual(0);
    }
  });

  test("keeps the chosen view in the address", async ({ page }) => {
    const id = await mapped(page);
    await page.goto(`/tools/journey-mapper/${id}?tab=table`);
    await expect(tab(page, "Structured table")).toHaveAttribute("aria-selected", "true");
    await tab(page, "Presentation").click();
    await expect(page).toHaveURL(/tab=presentation/);
  });
});

test.describe("journey mapper: evidence and opportunities", () => {
  async function withEvidence(page: Page) {
    await signUp(page);
    await createProjectWithBrief(page, { name: "Budgeto" });
    await createSynthesis(page, { title: "Interviews", projectName: "Budgeto" });
    await addObservation(page, "Could not find pricing", { participant: "P1" });
    const id = await createJourney(page, { name: "First week", projectName: "Budgeto" });
    await addStage(page, "Discover");
    await addStage(page, "Sign up");
    return id;
  }

  test("links a pain point to an observation and a note, and shows the evidence on the map", async ({ page }) => {
    const id = await withEvidence(page);
    await addJourneyItem(page, "Discover", "Pain points", "Pricing is hard to find");
    await page.getByRole("textbox", { name: /^Evidence note for Pricing is hard/ }).fill("Seen in 3 of 5 sessions");
    await page.getByRole("combobox", { name: /^Linked observation for Pricing is hard/ }).selectOption({ label: "Could not find pricing (P1)" });
    await expect(page.locator("[data-save-status]")).toHaveAttribute("data-save-status", "saved", { timeout: 10_000 });

    await page.reload();
    await expect(page.getByRole("combobox", { name: /^Linked observation for Pricing is hard/ })).toHaveValue(/.+/);
    await expect(page.getByRole("textbox", { name: /^Evidence note for Pricing is hard/ })).toHaveValue("Seen in 3 of 5 sessions");
    await page.goto(`/tools/journey-mapper/${id}`);
    await expect(page.getByRole("region", { name: "Journey map" }).locator('[data-row="pain_point"]')).toContainText("Seen in 3 of 5 sessions");
  });

  test("an observation from another account can't be linked", async ({ page, browser }) => {
    const id = await withEvidence(page);
    await addJourneyItem(page, "Discover", "Pain points", "Pricing is hard to find");
    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await signUp(otherPage);
    await createProject(otherPage, { name: "Theirs" });
    await createSynthesis(otherPage, { title: "Private", projectName: "Theirs" });
    await addObservation(otherPage, "A participant's private words");
    await other.close();
    // Their observation is never offered to this account.
    await page.goto(`/tools/journey-mapper/${id}`);
    await tab(page, "Edit stages").click();
    await expect(page.getByRole("combobox", { name: /^Linked observation for/ }).getByRole("option", { name: /private words/ })).toHaveCount(0);
  });

  test("hands pain points and opportunities on with their stage and evidence, once", async ({ page }) => {
    await withEvidence(page);
    await addJourneyItem(page, "Sign up", "Pain points", "Bank linking takes too long");
    await page.getByRole("textbox", { name: /^Evidence note for Bank linking/ }).fill("P2 gave up here");
    await addJourneyItem(page, "Sign up", "Opportunities", "Offer manual entry first");
    await addJourneyItem(page, "Sign up", "User actions", "Taps sign up");
    // Only pain points and opportunities can be handed on.
    await expect(page.getByRole("button", { name: /^Add to opportunities: Taps sign up/ })).toHaveCount(0);

    await page.getByRole("button", { name: /^Add to opportunities: Bank linking/ }).click();
    await page.getByRole("button", { name: /^Add to opportunities: Offer manual/ }).click();
    await expect(page.getByText("In opportunities")).toHaveCount(2);
    await expect(page.getByRole("button", { name: /^Add to opportunities: Bank linking/ })).toHaveCount(0);

    await tab(page, "Opportunities").click();
    const list = page.locator("[data-candidate]");
    await expect(list).toHaveCount(2);
    const pain = list.filter({ hasText: "Bank linking takes too long" });
    await expect(pain).toContainText("Pain point");
    await expect(pain).toContainText("Stage: Sign up");
    await expect(pain).toContainText("First week");
    await expect(pain).toContainText("Evidence: P2 gave up here");
    await expect(list.filter({ hasText: "Offer manual entry first" })).toContainText("Opportunity");

    // The stage and evidence survive deleting the stage.
    await page.reload();
    await tab(page, "Edit stages").click();
    await page.getByRole("button", { name: "Delete stage Sign up" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete stage" }).click();
    await tab(page, "Opportunities").click();
    await expect(page.locator("[data-candidate]").filter({ hasText: "Bank linking takes too long" })).toContainText("Stage: Sign up");
    await expect(page.locator("[data-candidate]")).toHaveCount(2);

    await page.getByRole("button", { name: /^Remove from opportunities: Bank linking/ }).click();
    await expect(page.locator("[data-candidate]")).toHaveCount(1);
    await page.reload();
    await tab(page, "Opportunities").click();
    await expect(page.locator("[data-candidate]")).toHaveCount(1);
  });

  test("an empty opportunities tab says how to fill it", async ({ page }) => {
    await setup(page);
    await tab(page, "Opportunities").click();
    await expect(page.getByText("In Edit stages, use “Add to opportunities”")).toBeVisible();
  });
});

test.describe("journey mapper: lists, copies and access", () => {
  test("copies a journey as a future state with its stages and items", async ({ page }) => {
    const id = await mapped(page);
    await page.goto("/tools/journey-mapper");
    const card = page.getByRole("article").filter({ hasText: "First week with Budgeto" });
    await expect(card).toContainText("3 stages");
    await expect(card).toContainText("Current state");
    await page.getByRole("button", { name: "Actions for First week with Budgeto" }).click();
    await page.getByRole("menuitem", { name: "Copy as future state" }).click();
    await expect(page).toHaveURL(/\/tools\/journey-mapper\/[0-9a-f-]{36}(\?.*)?$/);
    expect(page.url()).not.toContain(id);
    await expect(page.getByRole("textbox", { name: "Journey name" })).toHaveValue("First week with Budgeto (copy)");
    await expect(page.getByRole("main")).toContainText("Future state");
    // It opens on the map because it already has stages.
    await expect(tab(page, "Visual map")).toHaveAttribute("aria-selected", "true");
    await tab(page, "Edit stages").click();
    await expect(stageNames(page)).toHaveCount(3);
    await expect(page.getByRole("textbox", { name: /^Action: Searches for budgeting apps/ })).toBeVisible();
  });

  test("renames, changes state and persona from the details, and marks complete only with a stage", async ({ page }) => {
    await setup(page, { persona: "Maya" });
    await page.getByRole("button", { name: "Mark as complete" }).click();
    await expect(page.getByText("Add at least one stage before marking this complete.")).toBeVisible();
    await addStage(page, "Discover");

    await page.getByRole("textbox", { name: "Journey name" }).fill("Renamed journey");
    await page.getByText("Journey details").click();
    await page.getByRole("combobox", { name: "State" }).selectOption({ label: "Future state" });
    await page.getByRole("combobox", { name: "Persona" }).selectOption({ label: "No persona" });
    await expect(page.locator("[data-save-status]")).toHaveAttribute("data-save-status", "saved", { timeout: 10_000 });
    await page.reload();
    await expect(page.getByRole("textbox", { name: "Journey name" })).toHaveValue("Renamed journey");
    await expect(page.getByRole("main")).toContainText("Future state");
    await expect(page.getByRole("main")).not.toContainText("Persona: Maya");

    await page.getByRole("button", { name: "Mark as complete" }).click();
    await expect(page.getByRole("main").getByText("Completed", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Reopen" }).click();
    await expect(page.getByRole("button", { name: "Mark as complete" })).toBeVisible();
  });

  test("appears on the project page with its tool, in recents, and opens as a drawer", async ({ page }) => {
    await signUp(page);
    const projectId = await createProject(page, { name: "Budgeto" });
    await page.getByRole("main").getByRole("button", { name: "New" }).click();
    await page.getByRole("menuitem", { name: "Journey map" }).click();
    await expect(page.getByRole("dialog").getByRole("heading", { name: "New journey map" })).toBeVisible();
    await expect(page.getByRole("dialog").getByLabel("Project")).toHaveValue(projectId);
    await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await createJourney(page, { name: "First week", projectName: "Budgeto" });
    await page.goto(`/projects/${projectId}?view=table`);
    const row = page.getByRole("main").locator("tr[data-kind=journey]");
    await expect(row).toContainText("First week");
    await expect(row.locator("td").first()).toHaveText("Journey");
    await page.goto(`/projects/${projectId}?type=journey`);
    await expect(page.getByRole("main").locator("li[data-kind]")).toHaveCount(1);
    await page.goto("/recent");
    await expect(page.getByRole("main").locator("tr[data-kind=journey]")).toContainText("Journey map");
  });

  test("another user cannot open or see a journey they do not own", async ({ page, browser }) => {
    const id = await setup(page);
    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await signUp(otherPage);
    await otherPage.goto(`/tools/journey-mapper/${id}`);
    await expect(otherPage.getByText("Journey not found")).toBeVisible();
    await otherPage.goto("/tools/journey-mapper");
    await expect(otherPage.getByText("First week with Budgeto")).toHaveCount(0);
    await other.close();

    const anon = await browser.newContext();
    const anonPage = await anon.newPage();
    await anonPage.goto(`/tools/journey-mapper/${id}`);
    await expect(anonPage).toHaveURL(/\/login/);
    await anon.close();
  });

  test("deleting a journey asks first and removes its stages", async ({ page }) => {
    await mapped(page);
    await page.goto("/tools/journey-mapper");
    await page.getByRole("button", { name: "Actions for First week with Budgeto" }).click();
    await page.getByRole("menuitem", { name: "Delete journey" }).click();
    await expect(page.getByRole("alertdialog")).toContainText("permanently deleted");
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete journey" }).click();
    await expect(page.getByText("No journey maps yet")).toBeVisible();
  });

  test("the tool and its empty state are reachable from the navigation", async ({ page }) => {
    await signUp(page);
    await page.goto("/tools/journey-mapper");
    await expect(page.getByRole("heading", { level: 1, name: "Journey Mapper" })).toBeVisible();
    await expect(page.getByText("No journey maps yet")).toBeVisible();
    await page.goto("/tools/research-synthesizer");
    await expect(page.getByRole("heading", { level: 1, name: "Research Synthesizer" })).toBeVisible();
  });
});
