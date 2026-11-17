---
name: Yedara
description: Know. Explore. Understand. White paper on a pale butter desk, one amber accent and a serif voice for headlines. The "Butter" system, shared with Doxa, applied to a connected UX research workspace and its marketing site.
colors:
  accent: "#e8b923"
  accent-hover: "#d4a615"
  accent-text: "#826400"
  accent-tint: "#faf4df"
  on-accent: "#353335"
  background: "#ffffff"
  desk: "#fcfaf3"
  sand: "#f8f4e4"
  ink: "#4d4a4d"
  ink-strong: "#353335"
  ink-muted: "#6b6b6b"
  hairline: "#ece5cc"
  hairline-strong: "#dccfa6"
  control-border: "#8a7f6e"
  success: "#146c43"
  warning: "#8a5a00"
  info: "#1f5f9e"
  destructive: "#b3261e"
typography:
  display:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "4.5rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "28px"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
  body:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
rounded:
  input: "8px"
  menu: "11px"
  card: "20px"
  pill: "9999px"
spacing:
  page-gutter: "32px"
  container-app: "1400px"
  container-marketing: "1152px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.pill}"
    height: "40px"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.ink-strong}"
    rounded: "{rounded.pill}"
    height: "40px"
  input-control:
    backgroundColor: "{colors.background}"
    rounded: "{rounded.input}"
    height: "40px"
  card:
    backgroundColor: "{colors.background}"
    rounded: "{rounded.card}"
    padding: "20px"
  badge-soft:
    backgroundColor: "{colors.accent-tint}"
    textColor: "{colors.accent-text}"
    rounded: "{rounded.pill}"
    height: "20px"
  nav-item-current:
    backgroundColor: "{colors.accent-tint}"
    textColor: "{colors.accent-text}"
    rounded: "{rounded.pill}"
  band-desk:
    backgroundColor: "{colors.desk}"
    padding: "80px 24px"
---

# Design System: Yedara

## Overview

**Creative North Star: "White Paper on a Butter Desk"**

Yedara uses the Butter system, the same tokens as Doxa. **Desk** (`--surface`, `--sidebar`, #fcfaf3) is chrome: the app sidebar, marketing bands, the hero, the footer, the auth form ground and the legal pages. **Paper** (`--background`, `--card`, #ffffff) is what people work with: cards, forms, the affinity board, the drawer. **Amber** (`--primary`, #e8b923) is a fill that marks what is actionable or selected: the primary button, the logo and favicon, the persona initials in previews, the left wing of the logo, the 3px rule atop the mobile header. Amber is never small text; text that carries the accent is ochre (`--primary-text`, #826400), which is also the focus colour. Text on amber is charcoal (`--primary-foreground`, #353335), never white. Newsreader carries headlines; DM Sans carries everything else.

Two modes share the language. The marketing site persuades: desk and white bands alternate, the hero headline carries one ochre phrase, and a CSS laptop holding real captures of the Research Synthesizer straddles the desk/white split. The app operates: flat, hairline, tonal.

**Key Characteristics**

- One amber voice, a fill. Ochre when the accent is text. Charcoal on amber. The logo and favicon are two wings: the left is the primary-button amber (#E8B923), the right is dark grey (#444444, lightened to #E7E0D6 in dark mode and in dark browser tabs so it stays visible). The amber is the same in both themes.
- Newsreader 500 (one static weight, no optical-size axis) for every `h1`, `h2` and `.font-display`, enforced by one unlayered rule in `globals.css`; DM Sans for everything else. Bold and extra-bold both resolve to 600 outside headings.
- Shape: every button is a pill; inputs 8px; menus about 11px; cards, panels and dialogs 20px (`rounded-card`).
- Selection is butter, not grey: current tab, nav item and segmented option are `--accent` with `--accent-foreground`; hover is sand (`--muted`).
- Drawers and dialogs: chrome on the desk ground, content on paper, hairlines between (see Drawers and Dialogs).
- **Light or dark, nothing else.** No system option. A sun/moon pill (`ThemeMenu`) flips between exactly two themes; key `yedara-theme`, default light, set before paint by an inline script. Dark is a warm charcoal ramp (#141312 ground, #1c1b19 cards, #181716 desk), never neutral grey.
- Flat at rest: depth is ground plus a 1px hairline. Shadows belong to overlays and to the one picture of a device (`--shadow-device`). Entity cards take an amber border on hover.
- Motion is feedback and one hero entrance; reduced motion keeps the meaning without the travel.

## Colors

- **Butter Amber** (`--primary`, #e8b923; hover #d4a615, dark hover #f0c94a): primary button, logo, favicon, current-step dots, the hero badge dot.
- **Ochre** (`--primary-text`, `--accent-foreground`, `--ring`; #826400, dark #f0c94a): links, current nav text, focus ring, checks and icons on white.
- **Amber Tint** (`--primary-soft`, `--accent`; #faf4df, dark #2a2410): selected row/tab/nav item, soft badges, icon tiles, text selection.
- **Paper / Desk / Sand:** #ffffff / #fcfaf3 / #f8f4e4 (dark #1c1b19 / #181716 / #262420).
- **Ink** #4d4a4d body, **Ink Strong** #353335 headings, **Ink Muted** #6b6b6b meta (dark #e6e2da / #faf8f2 / #a8a399).
- **Hairline** #ece5cc every border; **Hairline Strong** #dccfa6 outline buttons and menus; **Control Border** #8a7f6e field outlines (3:1).
- Semantic `success`, `warning`, `info`, `destructive` and `-soft` grounds; destructive actions are an outline button with red text, never a solid red block.

**The One Voice Rule.** Amber is the only brand accent and it is a fill. Accent as text is ochre; never use the fill colour as small text and never put white on amber. This covers icons and check marks: on white they use `text-primary-text`, and tinted tiles use `bg-primary-soft`.

**The Token Only Rule.** No literal brand hex, `bg-white` or hard-coded cream in components; use `primary`, `surface`, `card`, `muted`. Tests enforce this (exempt: `layout.tsx` theme-color, the auth photo scrim, the social card, PDF/DOCX exports, which have no CSS).

## Typography

Newsreader 500 for display and headlines, DM Sans for the work. Hierarchy comes from the face switch, weight (400, 600, 500 on controls and nav) and a few fixed sizes.

- **Display** (Newsreader 500, 48px / 72px from `sm`, line-height 1): the marketing hero `h1`, with one ochre phrase.
- **Headline** (Newsreader 500, 28px, 1.25): app page titles. Marketing section titles are 36px, 48px from `sm`.
- **Title** (DM Sans 600, 15px): card titles, h3 in the app. Big marketing h3s (module names, workflow phases, plan names) are `font-display`.
- **Body** (400, 14px) in the app, 16px on marketing; leads are 18px in `ink-muted`.
- **Label** (600, 12px, sentence case): badges, meta, column headers.

Sentence case everywhere: no uppercase, no letter-spaced labels. `tabular-nums` on counts. Section eyebrows are not used; the heading carries its own weight.

## Layout

The signed-in app is a 288px desk sidebar beside a white content area capped at 1400px with 16/24/32px gutters. Marketing is `max-w-[1152px]` with 64 to 80px section rhythm; bands alternate `desk` and white, separated by a hairline (`border-t`). The hero sits on desk, then a hard split (desk above, white below, not a gradient) behind the laptop. The closing CTA is a white band, not an amber one.

## Elevation & Depth

Flat and tonal. Only drawers (`--shadow-drawer`/`--shadow-raised` over a scrim), dialogs, menus and the laptop (`--shadow-device`) cast a shadow.

## Components

- **Buttons:** full pill, DM Sans 600 14px. 40px default, 36px `sm`, 48px `lg`, 28px `xs`. Primary amber with charcoal text and hover `accent-hover`; used once per view. Outline: white ground, hairline-strong border, sand hover. Ghost and secondary use sand. Destructive is outline with red text. Focus is a 3px ochre ring at 40%; press scales to 0.98.
- **Inputs:** 40px, 8px radius, white ground, control-border outline, focus turns the border ochre with a 3px ring at 30%.
- **Badges:** 20px pills, 12px 600. Soft (tint + ochre), secondary (sand), outline, plus semantic.
- **Cards:** 20px, 1px hairline, white, flat at rest; clickable entity cards take an amber border on hover/focus.
- **Navigation:** marketing header is sticky white at 90% with blur and a hairline; links are pills, current is `accent` with ochre semibold. The app sidebar items are pills with the same current/hover rules. The research tools are grouped under small phase sub-headings (Plan, Research, Understand, Prioritise), the same grouping and order as the website's workflow band, defined once as `phase` on each tool in `src/config/tools.ts`.
- **Logo:** `LogoMark`, two wings. Left wing `--primary` amber (#E8B923), right wing `--brand-ink` dark grey (#444444, #E7E0D6 in dark). `variant="white"` (right wing at 70%) only on the photographic auth panel. `src/app/icon.svg` carries the same two colours and lightens the grey wing under `prefers-color-scheme: dark`; `favicon.ico` and `apple-icon.png` sit the mark on a white tile so it reads on any tab.
- **Laptop (`LaptopMockup`):** charcoal bezel, notch, aluminium deck, `--shadow-device`, holding `public/marketing/app-board.png` and `app-board-dark.png` (2880 by 1800, swapped by theme) of a fictional "Pantry onboarding study". Retake both whenever the app chrome changes, and keep the caption that says it is sample data.
- **Segmented control (`Segmented`, the Synthesizer view switcher):** a pill track on paper with a hairline; options are pills; the current option is butter (`--accent`, ochre text, a 1px amber inset ring so it reads against the track); hover is sand. Never sand on sand.
- **Features index (`FeatureAnchors`):** the seven tool pills stick under the site header (top 64px) while you read the tools and release when they end. One butter highlight with an amber hairline glides between the pills (transform and width, 500ms exponential ease-out) as you click or scroll; the section crossing the upper third of the viewport is current (`aria-current="location"`). Click smooth-scrolls (`html:has(.marketing) { scroll-behavior: smooth }`); the highlight moves at once and the scroll-spy is paused for 1.1s so it never flickers through the tools in between. The pills rise in once, staggered 55ms; the target tool's icon tile flashes amber and settles (`article:target .module-tile`, 1.1s). On phones the row scrolls sideways and keeps the current pill centred. Without JavaScript they are plain `#anchor` links. Reduced motion: no smooth scroll, no entrance, no scale; the highlight still moves (150ms) and the arrival is a colour fade only.
- **Legal and About pages:** one layout, the same as Doxa. `LegalPageShell`: desk ground, a `max-w-3xl` column (`px-4 py-16 sm:px-6 sm:py-20`), an optional small soft badge (About only: "V1"), a Newsreader `h1` (36px, 48px from `sm`), a 16px subtitle (About) or a 14px "Last updated" line (Privacy, Terms; titles are Title Case), then the whole document in one white 20px card with a hairline (`doc-card`, 14px muted text, `p-6 sm:p-8`). Section `h2`s are DM Sans 16px 600 in ink strong; Privacy and Terms are flat `h2`, `p` and `ul`; links are ochre and underlined.
- **How it is built (About):** a two-column definition grid, as in Doxa: each term is a 12px 600 uppercase tracked label in muted ink (the one place uppercase labels are allowed, to match Doxa), each value 14px in ink strong, `gap-x-6 gap-y-4`, followed by a paragraph on how access is checked.
- **Drawers (`DrawerShell`, used by `SideDrawer` and `RouteDrawer`):** right-hand, 448px (`sm`), 576px (`md`, the default and the create/edit routes) or 768px (`lg`, insights); full width below `sm`. A 20px rounded left edge, a hairline, `--shadow-drawer`, over a flat 40% scrim with no blur. The header is a desk bar with a hairline beneath (`px-8 py-6`): the title in Newsreader 24px (two lines at most), a 14px muted description and a 36px outlined pill close. The body is paper (`px-8 py-8`). Form actions marked `.form-actions` become the footer bar: desk ground, a hairline above, flush to the foot of the panel and the full width, Cancel (outline) left of the one primary on the right. It slides in over 220ms and out over 180ms; the scrim fades 180ms in and 150ms out. The panel takes focus itself, so it is `outline-none`. The mobile navigation sheet shares the scrim, shadow, close pill and timing.
- **Dialogs (`AlertDialog`):** only destructive confirmations interrupt. 20px, `max-w-md`, `--shadow-raised`, flat 40% scrim. A Newsreader 20px title, a 14px muted description, then a desk footer bar with a hairline holding Cancel (outline) and the action as the destructive outline button (red text, `destructive-soft` hover). It fades and scales from 97% over 180ms and out over 120ms.
- **Empathy Mapper canvas (`EmpathyWorkspace`):** the classic 2×2 cross on paper, divided by hairlines (the grid's 1px gap), inside one 20px frame. Says and Thinks above Does and Feels; the left column is **Observed** (soft amber badge) and the right is **Inferred** (outline badge). Each quadrant has a Newsreader 24px title, a one-line prompt, hairline note rows and a one-line add field. A note shows where it came from: an ochre-tint evidence pill for a cited observation, or a dashed **Assumed · Link evidence** pill; Says notes read as quotes. An empty quadrant shows a dashed hint and can be marked **Not yet researched** (a desk-ground dashed panel with Undo). The subject sits on the crosshair (anchored to the bottom-right corner of Says, so it stays on the hairlines however tall each row grows) as a round medallion (a persona's portrait, or initials in an amber tile) the top row's fields and the lower row's headings keep clear of it; on a phone the quadrants stack Says, Does, Thinks, Feels with the subject as a banner above.
- **Project chip (`ProjectChip`):** every research tool page (plan, persona, competitor analysis, synthesis, journey) shows its parent project as an outline pill link, "Project" in muted ink then the name in 600, with a folder icon in ochre, beside the back link. It links to the project page, so it is always clear which project the work belongs to and one click returns there. Hover is sand.
- **Toasts:** bottom centre, not bottom right. The drawer footer's primary button and the Feedback button live at the bottom right, and a toast under a resting pointer never times out (Sonner pauses a hovered toast).
- **Feedback panel:** the same dialog language: 20px, desk header with a Newsreader 20px title and the outlined pill close, paper body, desk footer bar with the one primary; the feedback types are pill radios in butter when chosen.
- **Auth panel:** from `lg` (58% wide) a photograph under one flat charcoal scrim (#353335 at 80%, no tint, no gradient) so the white logo, quote and copyright stay readable. The form side is desk.

## Do's and Don'ts

**Do** use `primary-text` for accent text; charcoal on amber; pills for buttons; 8px inputs; 20px cards; accent tint for selection and sand for hover; alternate desk and white bands; retake the captures when the chrome changes; keep both themes' amber identical.

**Don't** put the current segmented option and its track on the same tone; blur a scrim; give a drawer or dialog a white header; use a solid red block for a destructive action; add a system theme option; use amber as small text or white on amber; add a second accent, a gradient or a glow; use grey foreground-opacity washes for hover or selection; add shadows to resting cards, rows or badges; add a second filled primary to a view; put a heading in `font-bold` to change it (the One Heading Rule overrides it); hard-code hex in components.
