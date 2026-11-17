import { expect, test, type Page } from "@playwright/test";
import { addEmpathyNote, addObservation, createEmpathyMap, createPersona, createProject, createSynthesis, signUp } from "./helpers";

const section = (page: Page, quadrant: string) => page.locator(`[data-quadrant-section=${quadrant}]`);
const notes = (page: Page, quadrant: string) => section(page, quadrant).locator("[data-note]");
const noteMenu = (page: Page, quadrant: string, text: string) => section(page, quadrant).getByRole("button", { name: new RegExp(`^Actions for this ${quadrant} note: ${text}`) });
const saved = (page: Page) => expect(page.locator("[data-save-status]")).toHaveAttribute("data-save-status", "saved", { timeout: 10_000 });

async function setup(page: Page, options: { subject?: string; persona?: string } = {}) {
  await signUp(page);
  await createProject(page, { name: "Budgeto" });
  if (options.persona) await createPersona(page, { name: options.persona, projectName: "Budgeto" });
  return createEmpathyMap(page, { projectName: "Budgeto", subject: options.persona ? undefined : (options.subject ?? "Weeknight planner"), persona: options.persona });
}

test.describe("empathy mapper: creating", () => {
  test("a map needs a subject, but not a persona", async ({ page }) => {
    await signUp(page);
    await createProject(page, { name: "Budgeto" });
    await page.goto("/tools/empathy-mapper/new");
    await page.getByLabel("Map title").fill("Maya on a weeknight");
    await page.getByRole("combobox", { name: "Project" }).selectOption({ label: "Budgeto" });
    await page.getByRole("button", { name: "Start mapping" }).click();
    await expect(page.getByText("Say who this map is about, or choose a persona")).toBeVisible();
    await expect(page).toHaveURL(/\/new$/);

    await page.getByRole("textbox", { name: "Subject" }).fill("First-time home cook");
    await page.getByRole("button", { name: "Start mapping" }).click();
    await expect(page).toHaveURL(/\/tools\/empathy-mapper\/[0-9a-f-]{36}$/);
    await expect(page.getByText("Not linked to a persona")).toBeVisible();
    await expect(page.getByText("First-time home cook").first()).toBeVisible();
  });

  test("a persona from the project can be the subject, and its name is used", async ({ page }) => {
    await setup(page, { persona: "Maya the planner" });
    await expect(page.getByText("Persona: Maya the planner")).toBeVisible();
    await expect(page.getByText("Not linked to a persona")).toHaveCount(0);
  });

  test("opens as a drawer from the project's New menu and offers only that project's personas", async ({ page }) => {
    await signUp(page);
    await createProject(page, { name: "Budgeto" });
    await createProject(page, { name: "Other" });
    await createPersona(page, { name: "Maya of Budgeto", projectName: "Budgeto" });
    await page.goto("/tools/empathy-mapper/new");
    await page.getByRole("combobox", { name: "Project" }).selectOption({ label: "Budgeto" });
    await expect(page.getByRole("combobox", { name: "Persona" }).locator("option")).toHaveText(["No persona", "Maya of Budgeto"]);
    await page.getByRole("combobox", { name: "Project" }).selectOption({ label: "Other" });
    await expect(page.getByRole("combobox", { name: "Persona" }).locator("option")).toHaveText(["No persona"]);
  });
});

test.describe("empathy mapper: the map", () => {
  test("lays out the classic cross, with observed on the left and inferred on the right", async ({ page }) => {
    await setup(page);
    await expect(page.getByRole("link", { name: /Project\s*Budgeto/ })).toBeVisible();
    for (const [q, label, basis] of [["says", "Says", "Observed"], ["thinks", "Thinks", "Inferred"], ["does", "Does", "Observed"], ["feels", "Feels", "Inferred"]] as const) {
      await expect(section(page, q).getByRole("heading", { level: 2, name: label })).toBeVisible();
      await expect(section(page, q).getByText(basis, { exact: true })).toBeVisible();
    }
    const wide = (page.viewportSize()?.width ?? 0) >= 768;
    const box = async (q: string) => (await section(page, q).boundingBox())!;
    const [says, thinks, does, feels] = [await box("says"), await box("thinks"), await box("does"), await box("feels")];
    if (wide) {
      expect(thinks.x).toBeGreaterThan(says.x + 100);
      expect(Math.abs(thinks.y - says.y)).toBeLessThan(2);
      expect(does.y).toBeGreaterThan(says.y + 50);
      expect(Math.abs(feels.y - does.y)).toBeLessThan(2);
      expect(Math.abs(does.x - says.x)).toBeLessThan(2);
    } else {
      // On a phone they stack, observed first.
      expect(does.y).toBeGreaterThan(says.y);
      expect(thinks.y).toBeGreaterThan(does.y);
      expect(feels.y).toBeGreaterThan(thinks.y);
    }
  });

  test("the subject medallion sits on the crosshair and never covers a heading or a field", async ({ page }) => {
    await setup(page);
    test.skip((page.viewportSize()?.width ?? 0) < 768, "the medallion is only drawn when the quadrants sit in a cross");
    const intersects = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) =>
      a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
    for (const [width, height] of [[1280, 900], [1000, 800], [820, 1000]] as const) {
      await page.setViewportSize({ width, height });
      // Content makes the rows different heights, which is what moved the medallion off the crosshair.
      await addEmpathyNote(page, "says", `A quote at ${width}`);
      const medallion = (await page.locator("[data-medallion]").boundingBox())!;
      const says = (await section(page, "says").boundingBox())!;
      const thinks = (await section(page, "thinks").boundingBox())!;
      // Centred on the corner where the four quadrants meet.
      expect(Math.abs(medallion.x + medallion.width / 2 - thinks.x)).toBeLessThan(3);
      expect(Math.abs(medallion.y + medallion.height / 2 - (says.y + says.height))).toBeLessThan(3);
      for (const [q, selector] of [["feels", "h2"], ["feels", "p"], ["does", "h2"], ["says", "form input"], ["says", "form button"], ["thinks", "form input"], ["thinks", "form button"], ["thinks", "[data-note]"]] as const) {
        for (const el of await section(page, q).locator(selector).all()) {
          const box = await el.boundingBox();
          if (box) expect(intersects(medallion, box), `${q} ${selector} at ${width}px`).toBe(false);
        }
      }
    }
  });

  test("adds, edits, reorders and deletes notes, and keeps them after a reload", async ({ page }) => {
    await setup(page);
    await addEmpathyNote(page, "says", "I never trust the estimate");
    await addEmpathyNote(page, "says", "It felt slower than last time");
    await addEmpathyNote(page, "does", "Scrolled back to compare the total");
    await expect(notes(page, "says")).toHaveCount(2);
    // Says notes read as quotes.
    await expect(notes(page, "says").first()).toContainText("“I never trust the estimate”");
    await expect(page.getByText("3 notes · 0 with evidence")).toBeVisible();

    await noteMenu(page, "says", "It felt slower").click();
    await page.getByRole("menuitem", { name: "Move up" }).click();
    await expect(notes(page, "says").first()).toContainText("It felt slower than last time");

    await noteMenu(page, "does", "Scrolled back").click();
    await page.getByRole("menuitem", { name: "Edit" }).click();
    await page.getByRole("textbox", { name: /^Edit note:/ }).fill("Scrolled back twice to compare the total");
    await page.getByRole("button", { name: "Save note" }).click();
    await expect(notes(page, "does").first()).toContainText("twice");
    await saved(page);

    await page.reload();
    await expect(notes(page, "says").first()).toContainText("It felt slower than last time");
    await expect(notes(page, "does").first()).toContainText("twice");

    // Deleting asks first. Cancel keeps the note.
    await noteMenu(page, "says", "I never trust").click();
    await page.getByRole("menuitem", { name: "Delete note" }).click();
    const dialog = page.getByRole("alertdialog", { name: "Delete this note?" });
    await expect(dialog).toContainText("I never trust the estimate");
    await expect(dialog).toContainText("can't be undone");
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(notes(page, "says")).toHaveCount(2);

    // Confirming deletes it, and it stays deleted.
    await noteMenu(page, "says", "I never trust").click();
    await page.getByRole("menuitem", { name: "Delete note" }).click();
    await page.getByRole("alertdialog", { name: "Delete this note?" }).getByRole("button", { name: "Delete note" }).click();
    await expect(notes(page, "says")).toHaveCount(1);
    await page.reload();
    await expect(notes(page, "says")).toHaveCount(1);
  });

  test("won't add an empty note", async ({ page }) => {
    await setup(page);
    await expect(section(page, "says").getByRole("button", { name: /add note/i })).toBeDisabled();
    await section(page, "says").getByLabel("Add what they say").fill("   ");
    await expect(section(page, "says").getByRole("button", { name: /add note/i })).toBeDisabled();
    await expect(notes(page, "says")).toHaveCount(0);
  });
});

test.describe("empathy mapper: evidence", () => {
  test("a note is Assumed until it cites an observation, and can be unlinked again", async ({ page }) => {
    await signUp(page);
    await createProject(page, { name: "Budgeto" });
    await createSynthesis(page, { title: "Onboarding interviews", projectName: "Budgeto" });
    await addObservation(page, "I never trust the estimate until checkout", { participant: "P6" });
    await createEmpathyMap(page, { projectName: "Budgeto", subject: "Weeknight planner" });

    await addEmpathyNote(page, "says", "I never trust the estimate");
    const note = notes(page, "says").first();
    await expect(note.getByRole("button", { name: /^Assumed/ })).toBeVisible();

    await note.getByRole("button", { name: /Link evidence/ }).click();
    const drawer = page.getByRole("dialog", { name: "Link evidence" });
    await expect(drawer.getByText("I never trust the estimate until checkout")).toBeVisible();
    await drawer.getByRole("button", { name: /I never trust the estimate until checkout/ }).click();
    await expect(drawer).toHaveCount(0);
    await expect(note.getByText(/P6: I never trust the estimate until checkout/)).toBeVisible();
    await expect(note.getByRole("button", { name: /^Assumed/ })).toHaveCount(0);
    await expect(page.getByText("1 note · 1 with evidence")).toBeVisible();

    await page.reload();
    await expect(notes(page, "says").first().getByText(/P6:/)).toBeVisible();

    await noteMenu(page, "says", "I never trust").click();
    await page.getByRole("menuitem", { name: "Remove evidence link" }).click();
    await expect(notes(page, "says").first().getByRole("button", { name: /^Assumed/ })).toBeVisible();
    await expect(page.getByText("1 note · 0 with evidence")).toBeVisible();
  });

  test("says so when the project has no observations to cite", async ({ page }) => {
    await setup(page);
    await addEmpathyNote(page, "thinks", "This will take too long");
    await notes(page, "thinks").first().getByRole("button", { name: /Link evidence/ }).click();
    await expect(page.getByRole("dialog", { name: "Link evidence" }).getByText(/no observations yet/)).toBeVisible();
  });
});

test.describe("empathy mapper: completing", () => {
  test("every quadrant needs a note or to be marked not yet researched", async ({ page }) => {
    await setup(page);
    await expect(page.locator("[data-completion-hint]")).toContainText("Says, Thinks, Does, Feels");
    await page.getByRole("button", { name: "Mark as complete" }).click();
    await expect(page.getByText(/Add a note to Says, Thinks, Does, Feels/).first()).toBeVisible();
    await expect(page.getByText("Draft", { exact: true }).first()).toBeVisible();

    await addEmpathyNote(page, "says", "I never trust the estimate");
    await addEmpathyNote(page, "does", "Scrolled back to compare");
    await section(page, "thinks").getByRole("button", { name: "Mark as not yet researched" }).click();
    await expect(section(page, "thinks").getByText("Not yet researched")).toBeVisible();
    await expect(page.locator("[data-completion-hint]")).toContainText("Feels");
    await section(page, "feels").getByRole("button", { name: "Mark as not yet researched" }).click();
    await expect(page.locator("[data-completion-hint]")).toHaveCount(0);

    await page.getByRole("button", { name: "Mark as complete" }).click();
    await expect(page.getByText("Completed", { exact: true }).first()).toBeVisible();
    await page.reload();
    await expect(page.getByText("Completed", { exact: true }).first()).toBeVisible();
    await expect(section(page, "thinks").getByText("Not yet researched")).toBeVisible();

    await page.getByRole("button", { name: "Reopen" }).click();
    await expect(page.getByText("Draft", { exact: true }).first()).toBeVisible();
  });

  test("adding a note to a quadrant marked not yet researched clears the mark, and Undo works", async ({ page }) => {
    await setup(page);
    await section(page, "feels").getByRole("button", { name: "Mark as not yet researched" }).click();
    await expect(section(page, "feels").getByText("Not yet researched")).toBeVisible();
    await section(page, "feels").getByRole("button", { name: "Undo" }).click();
    await expect(section(page, "feels").getByRole("button", { name: "Mark as not yet researched" })).toBeVisible();
    await addEmpathyNote(page, "feels", "Anxious about hidden costs");
    await expect(section(page, "feels").getByText("Not yet researched")).toHaveCount(0);
  });
});

test.describe("empathy mapper: the workspace", () => {
  test("renames the map and changes who it is about from the details", async ({ page }) => {
    await setup(page, { subject: "Weeknight planner" });
    const title = page.getByRole("textbox", { name: "Map title" });
    await title.fill("Maya, Sunday planning");
    await title.blur();
    await saved(page);
    await page.getByText("Subject and situation").click();
    await page.getByRole("textbox", { name: "Who it is about" }).fill("Busy parent");
    await page.getByRole("textbox", { name: "Who it is about" }).blur();
    await page.getByRole("textbox", { name: "Situation" }).fill("Planning the week on a Sunday evening");
    await page.getByRole("textbox", { name: "Situation" }).blur();
    await saved(page);
    await page.reload();
    await expect(page.getByRole("textbox", { name: "Map title" })).toHaveValue("Maya, Sunday planning");
    await expect(page.getByText("Busy parent").first()).toBeVisible();
    await expect(page.locator("p").filter({ hasText: /Planning the week on a Sunday evening/ }).first()).toBeVisible();

    // Typing the original name back is a change from what is saved, so it saves too.
    await page.getByRole("textbox", { name: "Map title" }).fill("Maya on a weeknight");
    await page.getByRole("textbox", { name: "Map title" }).blur();
    await saved(page);
    await page.reload();
    await expect(page.getByRole("textbox", { name: "Map title" })).toHaveValue("Maya on a weeknight");
  });

  test("cannot be left without a subject", async ({ page }) => {
    await setup(page);
    await page.getByText("Subject and situation").click();
    await page.getByRole("textbox", { name: "Who it is about" }).fill("");
    await page.getByRole("textbox", { name: "Who it is about" }).blur();
    await expect(page.getByText("Say who this map is about, or choose a persona").first()).toBeVisible();
    // The field goes back to what is saved, so the page never shows a subject the server does not have.
    await expect(page.getByRole("textbox", { name: "Who it is about" })).toHaveValue("Weeknight planner");
  });
});

test.describe("empathy mapper: lists, copies and access", () => {
  test("shows in the list and the project, filters, duplicates with its notes, and deletes", async ({ page }) => {
    const id = await setup(page);
    await addEmpathyNote(page, "says", "I never trust the estimate");
    await addEmpathyNote(page, "does", "Scrolled back");
    await saved(page);

    await page.goto("/tools/empathy-mapper");
    const card = page.getByRole("article").filter({ hasText: "Maya on a weeknight" });
    await expect(card).toContainText("2 notes");
    await expect(card).toContainText("Budgeto");
    await expect(card).toContainText("Weeknight planner");

    await page.getByRole("button", { name: "Actions for Maya on a weeknight" }).click();
    await page.getByRole("menuitem", { name: "Duplicate" }).click();
    await expect(page).toHaveURL(/\/tools\/empathy-mapper\/[0-9a-f-]{36}$/);
    expect(page.url()).not.toContain(id);
    await expect(page.getByRole("textbox", { name: "Map title" })).toHaveValue("Maya on a weeknight (copy)");
    await expect(notes(page, "says")).toHaveCount(1);
    await expect(notes(page, "does")).toHaveCount(1);

    // In the project, with its own filter.
    await page.getByRole("link", { name: /Project\s*Budgeto/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Budgeto" })).toBeVisible();
    await page.getByRole("link", { name: /^Empathy maps\s*2$/ }).click();
    await expect(page.getByRole("article").filter({ hasText: "Empathy map" })).toHaveCount(2);

    await page.goto("/recent?type=empathy");
    await expect(page.getByText("Maya on a weeknight (copy)")).toBeVisible();

    await page.goto("/tools/empathy-mapper");
    await page.getByRole("button", { name: "Actions for Maya on a weeknight (copy)" }).click();
    await page.getByRole("menuitem", { name: "Delete empathy map" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete empathy map" }).click();
    await expect(page.getByRole("article")).toHaveCount(1);
  });

  test("says so when there are none", async ({ page }) => {
    await signUp(page);
    await page.goto("/tools/empathy-mapper");
    await expect(page.getByText("No empathy maps yet")).toBeVisible();
  });

  test("another user cannot open a map they do not own", async ({ page, browser }) => {
    const id = await setup(page);
    const other = await browser.newContext({ baseURL: test.info().project.use.baseURL });
    const otherPage = await other.newPage();
    await signUp(otherPage);
    await otherPage.goto(`/tools/empathy-mapper/${id}`);
    await expect(otherPage.getByText("Empathy map not found")).toBeVisible();
    await other.close();
  });

  test("a malformed id is simply not found", async ({ page }) => {
    await signUp(page);
    await page.goto("/tools/empathy-mapper/not-an-id");
    await expect(page.getByText("Empathy map not found")).toBeVisible();
  });
});
