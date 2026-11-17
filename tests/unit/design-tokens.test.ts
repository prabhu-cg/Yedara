import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.resolve(import.meta.dirname, "../../src/app/globals.css"), "utf8");

function block(selector: string) {
  const start = css.indexOf(`${selector} {`);
  const end = css.indexOf("\n}", start);
  const body = css.slice(start, end);
  return Object.fromEntries([...body.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1], m[2].toLowerCase()]));
}

const light = block(":root");
const dark = block(".dark");

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Every pair where text is drawn on a ground. All must meet WCAG AA (4.5:1). */
const TEXT_PAIRS: [string, string][] = [
  ["foreground", "background"],
  ["foreground", "muted"],
  ["foreground", "card"],
  ["foreground", "sidebar"],
  ["ink", "background"],
  ["ink", "card"],
  ["primary-text", "surface"],
  ["muted-foreground", "background"],
  ["muted-foreground", "muted"],
  ["muted-foreground", "card"],
  ["primary-foreground", "primary"],
  ["primary-text", "background"],
  ["primary-text", "primary-soft"],
  ["primary-text", "muted"],
  ["accent-foreground", "accent"],
  ["destructive", "background"],
  ["destructive", "destructive-soft"],
  ["success", "success-soft"],
  ["warning", "warning-soft"],
  ["info", "info-soft"],
  ["popover-foreground", "popover"],
];

describe("design tokens", () => {
  it("define the same tokens in light and dark", () => {
    expect(Object.keys(dark).sort()).toEqual(Object.keys(light).sort());
    expect(Object.keys(light).length).toBeGreaterThan(30);
  });

  it("use the Butter values: amber fill, ochre text, charcoal on amber, butter desk", () => {
    expect(light).toMatchObject({
      primary: "#e8b923",
      "primary-foreground": "#353335",
      "primary-hover": "#d4a615",
      "primary-text": "#826400",
      "primary-soft": "#faf4df",
      background: "#ffffff",
      surface: "#fcfaf3",
      muted: "#f8f4e4",
      foreground: "#353335",
      "muted-foreground": "#6b6b6b",
      border: "#ece5cc",
    });
    expect(dark).toMatchObject({ background: "#141312", card: "#1c1b19", sidebar: "#181716", border: "#2e2b26", primary: "#e8b923" });
  });

  it("keeps the amber the same in both themes, so the logo and CTA never change colour", () => {
    expect(dark.primary).toBe(light.primary);
  });

  describe.each([
    ["light", light],
    ["dark", dark],
  ])("%s theme contrast", (_name, tokens) => {
    it.each(TEXT_PAIRS)("%s on %s meets WCAG AA (4.5:1)", (fg, bg) => {
      expect(contrast(tokens[fg], tokens[bg]), `${fg} ${tokens[fg]} on ${bg} ${tokens[bg]}`).toBeGreaterThanOrEqual(4.5);
    });

    it("keeps the focus ring visible against the page (3:1)", () => {
      expect(contrast(tokens.ring, tokens.background)).toBeGreaterThanOrEqual(3);
    });
  });

  it("defines the device and overlay shadows", () => {
    expect(css).toMatch(/--shadow-device:/);
    expect(css).toMatch(/--shadow-drawer:/);
  });

  it("uses the Butter radii: 8px inputs, 20px cards (buttons are pills)", () => {
    expect(css).toMatch(/--radius:\s*0\.5rem/);
    expect(css).toMatch(/--radius-card:\s*1\.25rem/);
  });

  it("loads Newsreader for display and DM Sans for everything else", () => {
    expect(css).toMatch(/--font-sans:\s*var\(--font-dm-sans\)/);
    expect(css).toMatch(/--font-display:\s*var\(--font-newsreader\)/);
  });

  // layout.tsx is excluded: the `themeColor` meta (browser chrome) cannot use CSS variables.
  // auth-aside.tsx is excluded: the brand panel's dark-brown overlay is fixed (it sits on a photograph, so it must not follow the theme).
  // opengraph-image.tsx is excluded: the social card is rendered to a PNG without CSS, so it carries its own copy of the palette.
  // export/ is excluded: PDF and DOCX files have no CSS and carry their own copy of the palette.
  it("never hard-codes hex colours in components", async () => {
    const { globSync } = await import("node:fs");
    const files = globSync("src/**/*.tsx", { cwd: path.resolve(import.meta.dirname, "../..") }).filter((f) => !f.includes("export/") && f !== "src/app/layout.tsx" && !f.endsWith("auth-aside.tsx") && !f.endsWith("opengraph-image.tsx"));
    const offenders = files.filter((f) => /#[0-9a-fA-F]{6}\b/.test(readFileSync(path.resolve(import.meta.dirname, "../..", f), "utf8")));
    expect(offenders).toEqual([]);
  });
});
