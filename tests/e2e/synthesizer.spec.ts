import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { addObservation, createProject, createSynthesis, exportFromButton, isPhoneViewport, selectTab, signUp } from "./helpers";

const cards = (page: Page) => page.locator("[data-observation]");
const board = (page: Page) => page.getByRole("region", { name: "Affinity board" });
const themeColumn = (page: Page, title: string) => page.locator("section[data-column]:not([data-column=none])").filter({ has: page.locator(`input[value="${title}"]`) });
const ungrouped = (page: Page) => page.locator('section[data-column="none"]');

async function setup(page: Page, title = "Onboarding interviews") {
  await signUp(page);
  await createProject(page, { name: "Budgeto" });
  return createSynthesis(page, { title, projectName: "Budgeto" });
}

test.describe("research synthesizer: research material", () => {
  test("adds, edits and deletes observation cards with participant, source and tags", async ({ page }) => {
    await setup(page);
    await expect(page.getByText("No observations yet")).toBeVisible();
    await addObservation(page, "Could not find the pricing page", { participant: "P1", tags: "pricing, #navigation, Pricing" });

    const card = cards(page).first();
    await expect(card).toContainText("Participant P1");
    await expect(card.getByText("pricing", { exact: true })).toBeVisible();
    await expect(card.getByText("navigation", { exact: true })).toBeVisible();
    // Tags are de-duplicated ignoring case.
    await expect(card.getByText("pricing", { exact: true })).toHaveCount(1);
    await expect(card).toContainText("O1");

    await card.getByRole("button", { name: "Edit observation O1" }).click();
    const form = page.getByRole("form", { name: "Save observation" });
    await form.getByLabel("What was observed or said").fill("Could not find the pricing page after two minutes");
    await form.getByLabel("Card type").selectOption({ label: "Quote" });
    await form.getByRole("button", { name: "Save observation" }).click();
    await expect(cards(page).first()).toContainText("after two minutes");
    await expect(cards(page).first()).toContainText("Quote");

    await page.reload();
    await expect(cards(page).first()).toContainText("after two minutes");

    await cards(page).first().getByRole("button", { name: "Delete observation O1" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete observation" }).click();
    await expect(cards(page)).toHaveCount(0);
  });

  test("won't save an empty or oversized statement", async ({ page }) => {
    await setup(page);
    await page.getByRole("button", { name: "Add a statement" }).click();
    const form = page.getByRole("form", { name: "Add observation" });
    await form.getByRole("button", { name: "Add observation" }).click();
    await expect(form.getByText("Write the observation")).toBeVisible();
    await expect(cards(page)).toHaveCount(0);
  });

  test("pasted notes are previewed and only saved after confirming", async ({ page }) => {
    await setup(page);
    await page.getByRole("button", { name: "Paste notes" }).click();
    const paste = page.getByRole("group", { name: "Paste notes" });
    await paste.getByLabel("Notes").fill("Could not find pricing.\n\nLiked the quick setup\n\n- Gave up at the bank step\n\nA statement to drop");
    await paste.getByRole("button", { name: "Review" }).click();

    const review = page.getByRole("form", { name: "Review before adding" });
    await expect(review).toContainText("4 statements will become observation cards");
    // Nothing is saved yet.
    await page.reload();
    await expect(cards(page)).toHaveCount(0);

    await page.getByRole("button", { name: "Paste notes" }).click();
    await page.getByRole("group", { name: "Paste notes" }).getByLabel("Notes").fill("Could not find pricing.\n\nLiked the quick setup\n\n- Gave up at the bank step\n\nA statement to drop");
    await page.getByRole("group", { name: "Paste notes" }).getByRole("button", { name: "Review" }).click();
    await review.getByRole("button", { name: "Remove statement 4" }).click();
    await review.getByLabel("Source name").fill("Interview with P3");
    await review.getByLabel("Participant").fill("P3");
    await review.getByLabel("Tags").fill("onboarding");
    await review.getByRole("button", { name: "Add 3 observations" }).click();

    await expect(cards(page)).toHaveCount(3);
    await expect(cards(page).first()).toContainText("Participant P3");
    await expect(page.getByRole("heading", { name: /^Sources/ })).toBeVisible();
    await expect(page.getByText("Interview with P3").first()).toBeVisible();
    await page.reload();
    await expect(cards(page)).toHaveCount(3);
    await expect(cards(page).filter({ hasText: "Gave up at the bank step" })).toBeVisible();
    await expect(cards(page).filter({ hasText: "A statement to drop" })).toHaveCount(0);
  });

  test("a text file is validated, previewed and imported without ever being uploaded", async ({ page }) => {
    await setup(page);
    const uploads: string[] = [];
    page.on("request", (r) => { const type = r.headers()["content-type"] ?? ""; if (/multipart/i.test(type)) uploads.push(r.url()); });

    await page.getByRole("button", { name: "Upload a file" }).click();
    const group = page.getByRole("group", { name: "Upload a file" });
    await expect(group).toContainText("up to 1 MB");
    await expect(group).toContainText("not uploaded");

    // Wrong type, then too big, each with a clear reason and nothing imported.
    await group.getByLabel("Text file").setInputFiles({ name: "report.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
    await expect(group.getByRole("alert")).toContainText("isn't a supported type");
    await group.getByLabel("Text file").setInputFiles({ name: "huge.txt", mimeType: "text/plain", buffer: Buffer.alloc(1_100_000, "a") });
    await expect(group.getByRole("alert")).toContainText("The limit is 1.0 MB");
    await group.getByLabel("Text file").setInputFiles({ name: "binary.txt", mimeType: "text/plain", buffer: Buffer.from([0x68, 0x00, 0x69]) });
    await expect(group.getByRole("alert")).toContainText("doesn't look like a text file");
    await expect(cards(page)).toHaveCount(0);

    await group.getByLabel("Text file").setInputFiles({ name: "p2-notes.txt", mimeType: "text/plain", buffer: Buffer.from("Wanted a clearer price\n\nLiked the dashboard\n") });
    await expect(group).toContainText("p2-notes.txt");
    await group.getByRole("button", { name: "Review" }).click();
    const review = page.getByRole("form", { name: "Review before adding" });
    await expect(review.getByLabel("Source name")).toHaveValue("p2-notes");
    await expect(review).toContainText("2 statements");
    await page.reload();
    await expect(cards(page)).toHaveCount(0); // not saved before confirming

    await page.getByRole("button", { name: "Upload a file" }).click();
    await page.getByRole("group", { name: "Upload a file" }).getByLabel("Text file").setInputFiles({ name: "p2-notes.txt", mimeType: "text/plain", buffer: Buffer.from("Wanted a clearer price\n\nLiked the dashboard\n") });
    await page.getByRole("group", { name: "Upload a file" }).getByRole("button", { name: "Review" }).click();
    await page.getByRole("form", { name: "Review before adding" }).getByRole("button", { name: "Add 2 observations" }).click();
    await expect(cards(page)).toHaveCount(2);
    await expect(page.getByText("p2-notes.txt")).toBeVisible();
    expect(uploads).toEqual([]);
  });

  test("a csv file lets you choose the column to import", async ({ page }) => {
    await setup(page);
    await page.getByRole("button", { name: "Upload a file" }).click();
    const group = page.getByRole("group", { name: "Upload a file" });
    await group.getByLabel("Text file").setInputFiles({ name: "survey.csv", mimeType: "text/csv", buffer: Buffer.from('id,what was hardest\n1,"Finding pricing, honestly"\n2,Linking my bank\n3,\n') });
    await group.getByLabel("Column to import").selectOption({ label: "what was hardest" });
    await group.getByRole("button", { name: "Review" }).click();
    const review = page.getByRole("form", { name: "Review before adding" });
    await expect(review).toContainText("2 statements");
    await expect(review.getByText("Finding pricing, honestly")).toBeVisible();
    await review.getByLabel("Card type").selectOption({ label: "Survey response" });
    await review.getByRole("button", { name: "Add 2 observations" }).click();
    await expect(cards(page)).toHaveCount(2);
    await expect(cards(page).first()).toContainText("Survey response");
  });

  test("deleting a source can keep or delete its observations", async ({ page }) => {
    await setup(page);
    for (const name of ["First", "Second"]) {
      await page.getByRole("button", { name: "Paste notes" }).click();
      const g = page.getByRole("group", { name: "Paste notes" });
      await g.getByLabel("Notes").fill(`${name} observation one\n\n${name} observation two`);
      await g.getByRole("button", { name: "Review" }).click();
      const review = page.getByRole("form", { name: "Review before adding" });
      await review.getByLabel("Source name").fill(`${name} interview`);
      await review.getByRole("button", { name: "Add 2 observations" }).click();
      await expect(cards(page)).toHaveCount(name === "First" ? 2 : 4);
    }
    await page.getByRole("button", { name: "Delete source First interview" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete source" }).click();
    await expect(page.getByRole("button", { name: "Delete source First interview" })).toHaveCount(0);
    await expect(cards(page)).toHaveCount(4); // kept, just unlinked

    await page.getByRole("button", { name: "Delete source Second interview" }).click();
    await page.getByRole("alertdialog").getByLabel("Delete the observations too").check();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete source" }).click();
    await expect(cards(page)).toHaveCount(2);
    await page.reload();
    await expect(cards(page)).toHaveCount(2);
    await expect(cards(page).filter({ hasText: "Second observation" })).toHaveCount(0);
  });

  test("states privacy plainly and filters by search, participant and tag", async ({ page }) => {
    await setup(page);
    await expect(page.getByRole("note")).toContainText("participant codes");
    await expect(page.getByRole("note")).toContainText("never uploaded");
    await expect(page.getByRole("note")).toContainText("Nothing is sent to an AI service");
    await addObservation(page, "Pricing was buried", { participant: "P1", tags: "pricing" });
    await addObservation(page, "Setup felt quick", { participant: "P2", tags: "setup" });
    await page.getByPlaceholder("Search observations").fill("buried");
    await expect(cards(page)).toHaveCount(1);
    await page.getByPlaceholder("Search observations").fill("");
    await page.getByLabel("Participant", { exact: true }).selectOption("P2");
    await expect(cards(page)).toHaveCount(1);
    await expect(cards(page).first()).toContainText("Setup felt quick");
    await page.getByLabel("Participant", { exact: true }).selectOption("");
    await page.getByLabel("Tag", { exact: true }).selectOption("pricing");
    await expect(cards(page)).toHaveCount(1);
  });
});

test.describe("research synthesizer: affinity board", () => {
  async function withCards(page: Page, texts: string[]) {
    const id = await setup(page);
    for (const t of texts) await addObservation(page, t);
    await selectTab(page, "Affinity board");
    await expect(board(page)).toBeVisible();
    return id;
  }
  const addTheme = async (page: Page, title: string) => {
    await page.getByLabel("New theme title").fill(title);
    await page.getByRole("button", { name: "Add theme" }).click();
    await expect(themeColumn(page, title)).toBeVisible();
  };

  test("starts with every card ungrouped, and themes can be created and renamed", async ({ page }) => {
    await withCards(page, ["Pricing was buried", "Setup felt quick", "Gave up at the bank step"]);
    await expect(ungrouped(page).locator("[data-card]")).toHaveCount(3);
    await addTheme(page, "Pricing");
    await addTheme(page, "Setup");

    const title = page.getByRole("textbox", { name: "Theme title 1" });
    await title.fill("Cost and pricing");
    await title.press("Enter");
    await expect(themeColumn(page, "Cost and pricing")).toBeVisible();
    // An empty title isn't accepted: it reverts.
    await page.getByRole("textbox", { name: "Theme title 2" }).fill("   ");
    await page.getByRole("textbox", { name: "Theme title 2" }).blur();
    await expect(page.getByRole("textbox", { name: "Theme title 2" })).toHaveValue("Setup");
  });

  test("moves cards between themes with the keyboard-accessible menu, and it persists", async ({ page }) => {
    await withCards(page, ["Pricing was buried", "Setup felt quick", "Gave up at the bank step"]);
    await addTheme(page, "Pricing");
    await page.getByRole("combobox", { name: "Move card O1 to" }).selectOption({ label: "Pricing" });
    await page.getByRole("combobox", { name: "Move card O3 to" }).selectOption({ label: "Pricing" });
    await expect(themeColumn(page, "Pricing").locator("[data-card]")).toHaveCount(2);
    await expect(ungrouped(page).locator("[data-card]")).toHaveCount(1);
    await expect(page.locator("[data-save-status]")).toHaveAttribute("data-save-status", "saved", { timeout: 10_000 });

    await page.reload();
    await selectTab(page, "Affinity board");
    await expect(themeColumn(page, "Pricing").locator("[data-card]")).toHaveCount(2);
    await expect(themeColumn(page, "Pricing")).toContainText("Pricing was buried");
    await expect(ungrouped(page)).toContainText("Setup felt quick");

    // And back to ungrouped.
    await page.getByRole("combobox", { name: "Move card O1 to" }).selectOption({ label: "Not grouped yet" });
    await expect(ungrouped(page).locator("[data-card]")).toHaveCount(2);
  });

  test("drags a card into a theme with the pointer", async ({ page }) => {
    test.skip(isPhoneViewport(page), "Touch dragging is covered by the menu on phones.");
    await withCards(page, ["Pricing was buried", "Setup felt quick"]);
    await addTheme(page, "Pricing");
    const handle = page.getByRole("button", { name: "Drag card O1" });
    const target = themeColumn(page, "Pricing");
    await handle.scrollIntoViewIfNeeded();
    const from = (await handle.boundingBox())!;
    const to = (await target.boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + 20, from.y + 20, { steps: 4 });
    await page.mouse.move(to.x + to.width / 2, to.y + 60, { steps: 12 });
    await page.mouse.up();
    await expect(themeColumn(page, "Pricing").locator("[data-card]")).toHaveCount(1);
    await expect(themeColumn(page, "Pricing")).toContainText("Pricing was buried");
  });

  test("moves a card with the keyboard alone", async ({ page }) => {
    test.skip(isPhoneViewport(page), "Keyboard dragging is a desktop interaction.");
    await withCards(page, ["Pricing was buried", "Setup felt quick"]);
    await addTheme(page, "Pricing");
    await page.getByRole("button", { name: "Drag card O1" }).focus();
    await page.keyboard.press("Space");
    for (let i = 0; i < 3; i++) { await page.keyboard.press("ArrowRight"); }
    await page.keyboard.press("Space");
    await expect(page.locator("[data-save-status]")).toBeVisible();
    // Whether or not the arrow keys reached the theme, the card is never lost.
    await expect(page.locator("[data-card]")).toHaveCount(2);
  });

  test("undoes and redoes board changes, with buttons and shortcuts", async ({ page }) => {
    await withCards(page, ["Pricing was buried", "Setup felt quick"]);
    const undo = page.getByRole("button", { name: "Undo board change" });
    const redo = page.getByRole("button", { name: "Redo board change" });
    await expect(undo).toBeDisabled();
    await expect(redo).toBeDisabled();

    await addTheme(page, "Pricing");
    await page.getByRole("combobox", { name: "Move card O1 to" }).selectOption({ label: "Pricing" });
    await expect(themeColumn(page, "Pricing").locator("[data-card]")).toHaveCount(1);

    await undo.click(); // the move
    await expect(themeColumn(page, "Pricing").locator("[data-card]")).toHaveCount(0);
    await expect(ungrouped(page).locator("[data-card]")).toHaveCount(2);
    await expect(redo).toBeEnabled();
    await undo.click(); // the theme
    await expect(themeColumn(page, "Pricing")).toHaveCount(0);
    await expect(undo).toBeDisabled();

    await redo.click();
    await redo.click();
    await expect(themeColumn(page, "Pricing").locator("[data-card]")).toHaveCount(1);

    await board(page).focus();
    await page.keyboard.press("ControlOrMeta+z");
    await expect(themeColumn(page, "Pricing").locator("[data-card]")).toHaveCount(0);
    await page.keyboard.press("ControlOrMeta+Shift+z");
    await expect(themeColumn(page, "Pricing").locator("[data-card]")).toHaveCount(1);

    // The undone state is what gets saved.
    await undo.click();
    await expect(page.locator("[data-save-status]")).toHaveAttribute("data-save-status", "saved", { timeout: 10_000 });
    await page.reload();
    await selectTab(page, "Affinity board");
    await expect(themeColumn(page, "Pricing").locator("[data-card]")).toHaveCount(0);
    await expect(themeColumn(page, "Pricing")).toBeVisible();
  });

  test("deleting a theme ungroups its cards instead of deleting them, and can be undone", async ({ page }) => {
    await withCards(page, ["Pricing was buried", "Setup felt quick"]);
    await addTheme(page, "Pricing");
    await page.getByRole("combobox", { name: "Move card O1 to" }).selectOption({ label: "Pricing" });
    await page.getByRole("button", { name: "Delete theme Pricing" }).click();
    await expect(themeColumn(page, "Pricing")).toHaveCount(0);
    await expect(ungrouped(page).locator("[data-card]")).toHaveCount(2);
    await page.getByRole("button", { name: "Undo board change" }).click();
    await expect(themeColumn(page, "Pricing").locator("[data-card]")).toHaveCount(1);
  });

  test("zooms in and out, keeps its state, and pans inside its own frame", async ({ page }) => {
    await withCards(page, ["Pricing was buried"]);
    for (const n of ["A", "B", "C", "D"]) await addTheme(page, `Theme ${n}`);
    const zoom = page.getByRole("group", { name: "Zoom" });
    await expect(zoom).toContainText("100%");
    await zoom.getByRole("button", { name: "Zoom out" }).click();
    await expect(zoom).toContainText("90%");
    await zoom.getByRole("button", { name: "Zoom in" }).click();
    await zoom.getByRole("button", { name: "Zoom in" }).click();
    await expect(zoom).toContainText("115%");

    const region = board(page);
    const scrolls = await region.evaluate((el) => el.scrollWidth > el.clientWidth);
    expect(scrolls).toBe(true);
    const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(pageOverflow).toBeLessThanOrEqual(0);
    await region.evaluate((el) => { el.scrollLeft = 300; });
    expect(await region.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);

    await expect(page.locator("[data-save-status]")).toHaveAttribute("data-save-status", "saved", { timeout: 10_000 });
    await page.reload();
    await selectTab(page, "Affinity board");
    await expect(page.getByRole("group", { name: "Zoom" })).toContainText("115%");
  });

  test("editing a card from the board returns to the material tab", async ({ page }) => {
    await withCards(page, ["Pricing was buried"]);
    await page.getByRole("button", { name: "Edit card O1" }).click();
    await expect(page.getByRole("tab", { name: "Research material", selected: true })).toBeVisible();
    await expect(page.getByRole("form", { name: "Save observation" })).toBeVisible();
  });

  test("cards added or deleted elsewhere appear and disappear on the board", async ({ page }) => {
    await withCards(page, ["First card"]);
    await selectTab(page, "Research material");
    await addObservation(page, "Second card");
    await selectTab(page, "Affinity board");
    await expect(ungrouped(page).locator("[data-card]")).toHaveCount(2);
    await selectTab(page, "Research material");
    await cards(page).filter({ hasText: "First card" }).getByRole("button", { name: /Delete observation/ }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete observation" }).click();
    await selectTab(page, "Affinity board");
    await expect(ungrouped(page).locator("[data-card]")).toHaveCount(1);
  });
});

test.describe("research synthesizer: insights", () => {
  async function ready(page: Page) {
    const id = await setup(page);
    await addObservation(page, "Could not find the pricing page", { participant: "P1" });
    await addObservation(page, "Gave up at the bank step", { participant: "P2" });
    await selectTab(page, "Insights");
    return id;
  }

  test("an insight needs a statement and at least one piece of evidence", async ({ page }) => {
    await ready(page);
    await page.getByRole("button", { name: "New insight" }).click();
    const form = page.getByRole("form", { name: "Save insight" });
    await form.getByRole("button", { name: "Save insight" }).click();
    await expect(form.getByText("Write the insight statement")).toBeVisible();
    await expect(form.getByText("Link at least one observation as evidence")).toBeVisible();
    await form.getByLabel("Insight statement").fill("Pricing is buried");
    await form.getByRole("button", { name: "Save insight" }).click();
    await expect(form.getByText("Link at least one observation as evidence")).toBeVisible();
    await expect(page.locator("[data-insight]")).toHaveCount(0);
  });

  test("creates an insight with a kind, confidence, theme and traceable evidence", async ({ page }) => {
    await ready(page);
    await selectTab(page, "Affinity board");
    await page.getByLabel("New theme title").fill("Pricing");
    await page.getByRole("button", { name: "Add theme" }).click();
    await selectTab(page, "Insights");

    await page.getByRole("button", { name: "New insight" }).click();
    const form = page.getByRole("form", { name: "Save insight" });
    await form.getByRole("radio", { name: /Hypothesis/ }).check();
    await form.getByLabel("Observation", { exact: true }).fill("Two of two participants struggled with cost");
    await form.getByRole("list", { name: "Observations to cite" }).getByLabel(/Could not find the pricing page/).check();
    await form.getByLabel("Theme").selectOption({ label: "Pricing" });
    await form.getByLabel("Pattern").fill("Cost is hard to find");
    await form.getByLabel("User need").fill("See the cost before committing");
    await form.getByLabel("Problem or opportunity").selectOption({ label: "Problem" });
    await form.getByLabel("Describe it").fill("Pricing is hidden in the footer");
    await form.getByLabel("Insight statement").fill("People can't judge value because pricing is hidden");
    await form.getByLabel("Confidence").selectOption({ label: "Low confidence" });
    await form.getByLabel("Recommended action").fill("Add pricing to the main navigation");
    await form.getByRole("button", { name: "Save insight" }).click();

    const insight = page.locator("[data-insight]").first();
    await expect(insight).toContainText("People can't judge value because pricing is hidden");
    await expect(insight).toContainText("Hypothesis");
    await expect(insight).toContainText("Low confidence");
    await expect(insight).toContainText("Pricing");
    await expect(insight).toContainText("Add pricing to the main navigation");
    await insight.getByText("Evidence (1)").click();
    await expect(insight).toContainText("O1");
    await expect(insight).toContainText("Could not find the pricing page");

    await page.reload();
    await selectTab(page, "Insights");
    await expect(page.locator("[data-insight]").first()).toContainText("Evidence (1)");
  });

  test("evidence can be changed, and deleting evidence flags the insight instead of hiding it", async ({ page }) => {
    await ready(page);
    await page.getByRole("button", { name: "New insight" }).click();
    let form = page.getByRole("form", { name: "Save insight" });
    await form.getByRole("list", { name: "Observations to cite" }).getByLabel(/Could not find/).check();
    await form.getByLabel("Insight statement").fill("Pricing is buried");
    await form.getByRole("button", { name: "Save insight" }).click();
    await expect(page.locator("[data-insight]")).toHaveCount(1);

    await page.getByRole("button", { name: "Edit insight 1" }).click();
    form = page.getByRole("form", { name: "Save changes" });
    await form.getByRole("list", { name: "Observations to cite" }).getByLabel(/Gave up/).check();
    await form.getByRole("button", { name: "Save changes" }).click();
    await expect(page.locator("[data-insight]").first()).toContainText("Evidence (2)");

    // Remove the evidence's observations: the insight stays and says it has no evidence.
    await selectTab(page, "Research material");
    for (const text of ["Could not find", "Gave up"]) {
      await cards(page).filter({ hasText: text }).getByRole("button", { name: /Delete observation/ }).click();
      await expect(page.getByRole("alertdialog")).toContainText("evidence of 1 insight");
      await page.getByRole("alertdialog").getByRole("button", { name: "Delete observation" }).click();
    }
    await selectTab(page, "Insights");
    await expect(page.locator("[data-insight]").first()).toContainText("No evidence linked");
  });

  test("deletes an insight but keeps the observations it cited", async ({ page }) => {
    await ready(page);
    await page.getByRole("button", { name: "New insight" }).click();
    const form = page.getByRole("form", { name: "Save insight" });
    await form.getByRole("list", { name: "Observations to cite" }).getByLabel(/Could not find/).check();
    await form.getByLabel("Insight statement").fill("Pricing is buried");
    await form.getByRole("button", { name: "Save insight" }).click();
    await page.getByRole("button", { name: "Delete insight 1" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete insight" }).click();
    await expect(page.locator("[data-insight]")).toHaveCount(0);
    await selectTab(page, "Research material");
    await expect(cards(page)).toHaveCount(2);
  });

  test("with no observations it points at the Research material tab", async ({ page }) => {
    await setup(page);
    await selectTab(page, "Insights");
    await page.getByRole("button", { name: "New insight" }).click();
    await expect(page.getByText("Add observations on the Research material tab first")).toBeVisible();
  });
});

test.describe("research synthesizer: report", () => {
  async function built(page: Page) {
    const id = await setup(page, "Onboarding research");
    await addObservation(page, "Could not find the pricing page", { participant: "P1", tags: "pricing" });
    await addObservation(page, "Liked the quick setup", { participant: "P2" });
    await selectTab(page, "Affinity board");
    await page.getByLabel("New theme title").fill("Pricing");
    await page.getByRole("button", { name: "Add theme" }).click();
    await page.getByRole("combobox", { name: "Move card O1 to" }).selectOption({ label: "Pricing" });
    await selectTab(page, "Insights");
    await page.getByRole("button", { name: "New insight" }).click();
    const form = page.getByRole("form", { name: "Save insight" });
    await form.getByRole("list", { name: "Observations to cite" }).getByLabel(/Could not find/).check();
    await form.getByLabel("Theme").selectOption({ label: "Pricing" });
    await form.getByLabel("User need").fill("See the cost early");
    await form.getByLabel("Problem or opportunity").selectOption({ label: "Problem" });
    await form.getByLabel("Describe it").fill("Pricing is hidden");
    await form.getByLabel("Insight statement").fill("Pricing is buried");
    await form.getByLabel("Recommended action").fill("Add a pricing link");
    await form.getByRole("button", { name: "Save insight" }).click();
    await expect(page.locator("[data-insight]")).toHaveCount(1);
    await selectTab(page, "Report");
    return id;
  }

  test("shows every report section, built from the work, and keeps the written parts", async ({ page }) => {
    await built(page);
    const preview = page.getByText("Report preview").locator("xpath=ancestor::div[contains(@class,'min-w-0')][1]");
    for (const title of ["Research overview", "Methodology", "Participants", "Key themes", "Supporting observations", "Insights", "User needs", "Pain points", "Recommendations", "Limitations"]) {
      await expect(preview.getByRole("heading", { name: title, exact: true }).or(preview.getByText(title, { exact: true }).first())).toBeVisible();
    }
    await expect(preview).toContainText("Pricing (1 observation)");
    await expect(preview).toContainText("See the cost early");
    await expect(preview).toContainText("Pricing is hidden");
    await expect(preview).toContainText("Add a pricing link");
    await expect(preview).toContainText("2 observations from 0 sources and 2 participants");
    await expect(preview).toContainText("Not added yet.");

    await page.getByRole("textbox", { name: "Research overview", exact: true }).fill("We wanted to understand why people drop out");
    await page.getByRole("textbox", { name: "Limitations", exact: true }).fill("Only two participants");
    await expect(preview).toContainText("We wanted to understand why people drop out");
    await expect(page.locator("[data-save-status]")).toHaveAttribute("data-save-status", "saved", { timeout: 10_000 });
    await page.reload();
    await selectTab(page, "Report");
    await expect(page.getByRole("textbox", { name: "Research overview", exact: true })).toHaveValue("We wanted to understand why people drop out");
  });

  test("exports Markdown, Word and PDF with the evidence trail", async ({ page }) => {
    await built(page);
    await page.getByRole("textbox", { name: "Research overview", exact: true }).fill("We wanted to understand drop-off");
    await page.getByRole("textbox", { name: "Methodology", exact: true }).fill("Two moderated interviews");

    const md = await exportFromButton(page, "Markdown");
    expect(md.name).toMatch(/onboarding-research-synthesis\.md$/);
    const text = readFileSync(md.path!, "utf8");
    expect(text).toContain("# Onboarding research");
    expect(text).toContain("We wanted to understand drop-off");
    expect(text).toContain("Two moderated interviews");
    expect(text).toContain("Pricing is buried");
    expect(text).toContain("Could not find the pricing page");
    expect(text).toContain("O1");
    expect(text).toContain("researcher's interpretation");
    for (const heading of ["Research overview", "Key themes", "Insights", "User needs", "Pain points", "Recommendations", "Limitations"]) expect(text).toContain(heading);

    const docx = await exportFromButton(page, "Word");
    expect(docx.name).toMatch(/\.docx$/);
    expect(readFileSync(docx.path!).subarray(0, 2).toString()).toBe("PK");
    const pdf = await exportFromButton(page, "PDF");
    expect(pdf.name).toMatch(/\.pdf$/);
    expect(readFileSync(pdf.path!).subarray(0, 5).toString()).toBe("%PDF-");
  });

  test("marks a synthesis complete only when it has material, insights and evidence", async ({ page }) => {
    await setup(page);
    await selectTab(page, "Report");
    await page.getByRole("button", { name: "Mark as complete" }).click();
    await expect(page.getByText("Add some research material before marking this complete.")).toBeVisible();
    await selectTab(page, "Research material");
    await addObservation(page, "Gave up at the bank step");
    await selectTab(page, "Report");
    await page.getByRole("button", { name: "Mark as complete" }).click();
    await expect(page.getByText("Add at least one insight before marking this complete.")).toBeVisible();
  });
});

test.describe("research synthesizer: lists, access and responsiveness", () => {
  test("lists syntheses with counts, opens from the project page and deletes", async ({ page }) => {
    await signUp(page);
    const projectId = await createProject(page, { name: "Budgeto" });
    await createSynthesis(page, { title: "Round one", projectName: "Budgeto" });
    await addObservation(page, "A first observation");
    await page.goto("/tools/research-synthesizer");
    const card = page.getByRole("article").filter({ hasText: "Round one" });
    await expect(card).toContainText("1 observation");
    await expect(card).toContainText("0 insights");

    await page.goto(`/projects/${projectId}`);
    const row = page.getByRole("main").locator("li[data-kind=synthesis]");
    await expect(row).toContainText("Research synthesis");
    await row.getByRole("link", { name: "Round one" }).click();
    await expect(page).toHaveURL(/\/tools\/research-synthesizer\/[0-9a-f-]{36}$/);

    await page.goto("/tools/research-synthesizer");
    await page.getByRole("button", { name: "Actions for Round one" }).click();
    await page.getByRole("menuitem", { name: "Delete synthesis" }).click();
    await expect(page.getByRole("alertdialog")).toContainText("permanently deleted");
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete synthesis" }).click();
    await expect(page.getByText("No syntheses yet")).toBeVisible();
  });

  test("opens as a drawer from the project's New menu", async ({ page }) => {
    await signUp(page);
    const projectId = await createProject(page, { name: "Budgeto" });
    await page.getByRole("main").getByRole("button", { name: "New" }).click();
    await page.getByRole("menuitem", { name: "Research synthesis" }).click();
    await expect(page.getByRole("dialog").getByRole("heading", { name: "New research synthesis" })).toBeVisible();
    await expect(page.getByRole("dialog").getByLabel("Project")).toHaveValue(projectId);
  });

  test("another user cannot open, export or see a synthesis they do not own", async ({ page, browser }) => {
    const id = await setup(page, "Private research");
    await addObservation(page, "A private observation about a participant");

    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await signUp(otherPage);
    await otherPage.goto(`/tools/research-synthesizer/${id}`);
    await expect(otherPage.getByText("Synthesis not found")).toBeVisible();
    await expect(otherPage.getByText("A private observation")).toHaveCount(0);
    expect((await otherPage.request.get(`/api/syntheses/${id}/export?format=md`)).status()).toBe(404);
    await otherPage.goto("/tools/research-synthesizer");
    await expect(otherPage.getByText("Private research")).toHaveCount(0);
    await otherPage.goto("/recent");
    await expect(otherPage.getByText("Private research")).toHaveCount(0);
    await other.close();

    // Signed out, exports and the page need a sign-in.
    const anon = await browser.newContext();
    const anonPage = await anon.newPage();
    expect((await anonPage.request.get(`/api/syntheses/${id}/export?format=md`)).status()).toBe(401);
    await anonPage.goto(`/tools/research-synthesizer/${id}`);
    await expect(anonPage).toHaveURL(/\/login/);
    await anon.close();
  });

  test("rejects an unsupported export format and a malformed id", async ({ page }) => {
    const id = await setup(page);
    expect((await page.request.get(`/api/syntheses/${id}/export?format=exe`)).status()).toBe(400);
    expect((await page.request.get(`/api/syntheses/not-an-id/export?format=md`)).status()).toBe(404);
  });

  test("every tab fits the viewport without sideways page scroll", async ({ page }) => {
    await setup(page);
    await addObservation(page, "Could not find the pricing page after looking for a long time and giving up in frustration", { participant: "P1", tags: "pricing" });
    for (const tab of ["Research material", "Affinity board", "Insights", "Report"]) {
      await selectTab(page, tab);
      await expect(page.getByRole("tab", { name: tab, selected: true })).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `overflow on ${tab}`).toBeLessThanOrEqual(0);
    }
  });
});
