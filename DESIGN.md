---
name: Yedara Marketing Site
description: A white page with warm sand bands, hairline borders and one burnt-orange voice, showing real app screenshots and an evidence thread through a conventional SaaS skeleton.
colors:
  page: "#ffffff"
  card-white: "#ffffff"
  sand: "#f4f2ea"
  hairline: "#e8ddc8"
  hairline-strong: "#d6c7ab"
  ink: "#333333"
  ink-muted: "#5f5a54"
  thread-orange: "#c74504"
  thread-orange-hover: "#a93a03"
  thread-orange-text: "#a93a03"
  thread-tint: "#fdefe7"
  charcoal: "#333333"
  charcoal-text: "#faf9f6"
  ember: "#f28c38"
  success: "#146c43"
  success-soft: "#e6f4ec"
  warning: "#8a5a00"
  warning-soft: "#fdf3e0"
  destructive: "#b3261e"
  destructive-soft: "#fdeceb"
  info: "#1f5f9e"
  info-soft: "#ebf3fb"
typography:
  display:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 6.2vw, 4.75rem)"
    fontWeight: 800
    lineHeight: 1.04
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.875rem, 4.2vw, 3rem)"
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1.4
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  lede:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.33
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  panel: "16px"
  plan: "24px"
  full: "9999px"
spacing:
  section-y: "112px"
  section-y-mobile: "80px"
  gutter: "32px"
  gutter-sm: "24px"
  gutter-mobile: "20px"
  frame: "1152px"
components:
  button-primary:
    backgroundColor: "{colors.thread-orange}"
    textColor: "#ffffff"
    rounded: "{rounded.lg}"
    height: "48px"
    padding: "0 28px"
  button-primary-hover:
    backgroundColor: "{colors.thread-orange-hover}"
  button-hero:
    backgroundColor: "{colors.thread-orange}"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
    height: "48px"
    padding: "0 32px"
  button-outline:
    backgroundColor: "{colors.page}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    height: "48px"
    padding: "0 28px"
  button-on-primary:
    backgroundColor: "#ffffff"
    textColor: "{colors.thread-orange}"
    rounded: "{rounded.lg}"
    height: "44px"
    padding: "0 24px"
  obs-chip:
    backgroundColor: "{colors.thread-tint}"
    textColor: "{colors.thread-orange-text}"
    rounded: "{rounded.md}"
    height: "20px"
    padding: "0 6px"
  obs-chip-hot:
    backgroundColor: "{colors.thread-orange}"
    textColor: "#ffffff"
  app-window:
    backgroundColor: "{colors.card-white}"
    rounded: "{rounded.panel}"
  plan-panel:
    backgroundColor: "{colors.card-white}"
    rounded: "{rounded.plan}"
    padding: "36px"
---

# Design System: Yedara Marketing Site

## Overview

**Creative North Star: "The Evidence Thread"**

Research tools show boxes; Yedara shows the thread. The public site is a calm, conventional SaaS skeleton, following the Tynovo reference's layout and colour use: a white page, sand bands, warm hairlines, and orange spent on actions. The one signature is the evidence thread: a single orange line linking one tool to the next in the overview timeline, and the observation ID (O7) that travels through the authored previews.

The mood is plain-spoken, warm and specific. Surfaces are flat, separated by hairline borders and tonal bands (white and sand). Display type is heavy Manrope set tight. Proof is real or labelled: the hero shows a real screenshot of the app in a laptop frame; module previews are small authored app windows with invented, labelled sample data. No testimonials, stats or invented prices. The site extends the incumbent Yedara brand (burnt orange, Manrope, warm neutrals) and does not reinvent it.

**Key Characteristics:**
- Two-ground rhythm: white page (default) and sand bands (`#f4f2ea`, hairline top and bottom), closed by one flat orange band.
- One accent, orange, spent on actions, the thread and the final band.
- Manrope 800 for all display and titles; weight and scale carry hierarchy.
- Light and dark themes: a theme switch in the header, and the hero swaps light and dark app screenshots.
- Centred hero: pill badge, headline with a PointerHighlight word, rounded CTA plus text link, laptop-framed screenshot on a dot texture.
- Observation chips (O3, O7, O12) recur inside previews.

## Relationship to the app tokens

The authenticated app uses the "Working Ledger" tokens in `src/app/globals.css` (`:root` and `.dark`), same semantic names (`--background`, `--primary`, `--border`, `--muted`, ...). The marketing site does not fork components: `.marketing` in `src/app/(marketing)/marketing.css` re-points those same semantic variables, so shared `Button`, `Badge` and the Tailwind semantic utilities render in the marketing palette. A `.dark .marketing` block supplies the dark values. Marketing adds `--charcoal`, `--charcoal-foreground`, `--charcoal-muted` and `--ember`, defined only under `.marketing`.

Marketing now shares the app's page ground (`#ffffff`), sand (`#f4f2ea`), hairline (`#e8ddc8`) and strong hairline (`#d6c7ab`), the primary orange, Manrope and the status colors. It still diverges in foreground `#333333` (app `#1c1917`), muted text `#5f5a54` (app `#6f6963`) and base type 16px/1.6 (app 14px/1.43). New public pages use the marketing values; new in-app screens use the app values.

This document covers the public site only. App components (the side drawer, the Research Synthesizer table and tab treatment) are outside its scope.

## Colors

A warm-neutral palette on white with a single burnt-orange voice.

### Primary
- **Thread Orange** (#c74504): filled buttons, the evidence thread, the hot observation chip, focus ring, selection, the Free plan border, the flat final CTA band.
- **Deep Terracotta** (#a93a03): button hover and all orange used as text on white, sand or tint (links, the PointerHighlight word, check marks). Orange text on a light ground always uses this, never Thread Orange.
- **Thread Tint** (#fdefe7): resting observation chips and accent washes.

### Secondary
- **Ember** (#f28c38): the token remains and drives the focus outline inside a charcoal-tone section, but no page band uses it now.

### Neutral
- **Page White** (#ffffff): page ground, header, footer, cards, app windows, plan panel.
- **Sand** (#f4f2ea): band ground (`tone="sand"` sections), app window title bar, muted chips, input and pill fills.
- **Hairline** (#e8ddc8) and **Strong Hairline** (#d6c7ab): all borders; strong for dividers inside content (FAQ, differentiators), inputs and the dot texture.
- **Charcoal Ink** (#333333): body text, the laptop bezel and module icon tiles.
- **Quiet Ink** (#5f5a54): secondary copy, captions, ledes.
- **Charcoal Text** (#faf9f6): type on charcoal tiles.
- Status pairs (success #146c43, warning #8a5a00, info #1f5f9e, destructive #b3261e, each with a `-soft` tint) appear only inside mockups and badges as data states.

### Dark theme
`.dark .marketing` re-points the same names: ground `#12100e`, text `#faf7f2`, cards `#1c1916`, sand `#1f1b18`/`#1a1714`, hairlines `#302a25` and `#453d35`, orange text and ring lifted to `#ff8a5c`, hover `#dd5211`. Thread Orange fills stay `#c74504`. Full values are in the sidecar.

### Named Rules
**The One Voice Rule.** Orange is the only chromatic accent. Fills are Thread Orange, text is Deep Terracotta (light) or `#ff8a5c` (dark). Ember is not placed on a page band.
**The One Thread Rule.** The 2px orange line (primary at 40%) joining 28px node rings in the overview timeline is the only connective graphic. Do not add other connector motifs.

## Typography

**Display Font:** Manrope (with ui-sans-serif, system-ui, sans-serif)
**Body Font:** Manrope, same family
**Label/Mono Font:** none; numerals in chips use `tabular-nums`.

**Character:** One family, contrast made from weight (800 against 400/600) and tight tracking at scale. Friendly geometric shapes keep a research tool from feeling clinical.

### Hierarchy
- **Display** (800, clamp(2.5rem, 6.2vw, 4.75rem), 1.04, -0.04em): the home h1 only, centred. The final CTA headline is clamp(2rem, 4.6vw, 3.25rem) at 1.05, -0.03em.
- **Headline** (800, clamp(1.875rem, 4.2vw, 3rem), 1.08, -0.03em): every section h2, via `SectionHeading`. Balanced wrapping.
- **Title** (800, 1.25rem to 1.75rem, tight tracking): h3, differentiator terms, plan names, module names; workflow phase names go to 2rem at -0.03em.
- **Body** (400, 1rem, 1.6): paragraphs. Ledes are 1.125rem (up to 1.25rem in hero) in Quiet Ink, capped at 56 to 60ch.
- **Label** (700, 0.75rem): observation chips, tags, sample-data pill. Mockup interiors use 12 to 13px.

## Layout

A single 1152px centred frame (`FRAME`: max-width 1152px, gutters 20px, 24px from sm, 32px from lg). Sections pad 80px vertically on mobile and 112px from sm. Pages alternate white and sand grounds and end on the flat orange band. The hero is centred in a max 4xl column; below it the laptop mockup (max 1040px) sits on the same axis. Text and illustration split on a 12-column grid at lg (typically 5 and 7 columns, gap 64px); left columns can be sticky (top 7rem). The overview timeline is a grid with a 1.75rem node column and a 1fr text column, line and node in flow. Everything collapses to one column below lg; the header swaps to a menu button below md, with the theme switch kept visible. Body measure is held to 46 to 62ch.

## Elevation & Depth

Flat by default: depth is conveyed by hairline borders and the white and sand grounds. Shadows are rare and soft, reserved for objects that read as pictures of the product.

### Shadow Vocabulary
- **App window** (`box-shadow: 0 2px 4px -1px #1010140f, 0 18px 40px -14px #10101433`): the authored module previews.
- **Raised** (`0 2px 4px -1px #1010140f, 0 8px 24px -6px #1010141f`): the hot observation card inside a preview.
- **Laptop base** (`0 26px 40px -20px #10101459`): the hinge/base of the hero laptop mockup.
- **Sticky header** has no shadow, only a hairline bottom border and 92% page ground with backdrop blur.

### Named Rules
**The Flat-Page Rule.** Page furniture (sections, FAQ, lists, nav, footer) is never shadowed. Only product pictures and the highlighted card inside them lift.

## Shapes

Soft but not bubbly. Controls and chips are 6 to 8px; cards inside previews 8 to 12px; app windows 16px; plan panels 24px; the hero CTA, pills and step markers fully round. Borders are 1px hairline; the Pro plan panel uses a dashed strong hairline to signal "not on sale yet", and the Free panel a 1px orange border. Workflow steps use a 2px orange top rule with a 12px dot. The laptop frame has a 1.1rem (1.6rem from sm) lid radius and a notch.

## Components

### Buttons
Shared `Button`, restyled by the `.marketing` tokens.
- **Shape:** gently rounded (8px radius); the hero CTA only is a full pill.
- **Primary:** Thread Orange fill, white text, 700 weight; plan CTAs 48px tall with 28px side padding; hero CTA 48px tall, 32px side padding, fully round, with an arrow; header buttons 40px. One filled primary per view, apart from the final band.
- **Hover / Focus:** fill darkens to Deep Terracotta; focus-visible is a 2px ring-colour outline offset 3px (white inside the orange band); active nudges 1px down.
- **Outline / Ghost / Text link:** outline is white fill with hairline border, sand on hover; ghost has no border ("Sign in"); the hero's secondary action is a plain 15px semibold Quiet Ink text link that underlines on hover.
- **On primary:** in the final band, a white fill with Thread Orange text (44px tall, 24px padding), and a ghost with a 70% white border.

### Hero badge
A pill (full radius, sand fill, hairline border) holding an inner white pill with an orange dot and "Five tools live", then a "See what's inside" link with an arrow. See Not canonized.

### PointerHighlight (signature)
One headline word picked out the way a design tool selects it: Deep Terracotta text, a 2px primary-at-55% outline (6px radius), four 8px square corner handles and a pointer. Used on a single word in the h1 only.

### Laptop mockup (signature)
A MacBook-style frame around a real 2880x1800 app screenshot: charcoal bezel (2.2% padding), notch, hairline-gradient base 110% wide. Light and dark screenshots swap with the theme (`app-board.png`, `app-board-dark.png`); the image is never stretched. Captioned beneath in Quiet Ink 14px.

### Hero ground
`.hero-aura`: a fine dot texture (Strong Hairline dots, 1.4px, 24px grid) masked to fade toward the edges and bottom. No stripes, glow or gradient.

### Observation chip (signature)
A 20px-tall, 6px-radius, 12px bold tabular label of an ID such as O7. Resting: Thread Tint with Deep Terracotta text. Hot (the traced observation): Thread Orange with white text. Always paired with a source line ("P3 · interview").

### App window preview (signature)
Page White, 16px radius, strong hairline border, the app-window shadow. A sand title bar holds the logo mark, the study title and a "Sample data" pill. Wrapped in a `figure` with a visible caption, hidden from assistive tech. Interior cards are 8px radius, 1px hairline, 12px text; the hot card gets an orange border.

### Cards / Containers
Plan panels: 24px radius, 28 to 36px padding, Page White with orange border and a soft orange-tinted shadow for Free; transparent with dashed border for Pro. Elsewhere content is not carded: lists use top hairline dividers (FAQ, differentiators, module articles). Module names sit beside a 40px charcoal icon tile (12px radius).

### Navigation
Sticky 64px header, page ground at 92% with blur and hairline bottom border. Links 15px semibold in 80% ink, darkening on hover; the current page gets ink text with a 2px orange underline offset 8px. Right side: theme switch, ghost Sign in, primary Start free. Mobile: theme switch plus icon button toggling a stacked list with 18px links and a two-up Sign in / Start free row.

### Footer
White ground with a hairline top border. Logo and tagline left; four link columns (Product, Company, Legal, Account) right, 15px Quiet Ink links that underline on hover; a hairline-topped, centred 14px copyright line.

### Feedback widget
A fixed bottom-right pill (foreground colour, `Feedback` with a message icon) on every public page and inside the signed-in app. It opens a non-modal 24rem card panel (`rounded-2xl`, card surface, `shadow-xl`) with three pill radios (Something is broken, An idea or request, Something else), a textarea and a full-width primary button; Escape closes it and returns focus to the pill. It states that feedback is posted publicly on GitHub and asks for no name or email. Other CTAs (the Pro plan, "Ask us", the footer) open it through `OpenFeedback`, which sets the type. There is no contact page.

### Final CTA band
Flat Thread Orange full-bleed band, centred: headline in primary-foreground, 90% white lede (48ch), white button plus ghost button. No gradient, image or pattern.

### FAQ
Native `details` rows between strong hairlines; question in 18px bold, a 32px round plus icon rotating to a cross when open; answers in Quiet Ink at 62ch.

### Badges and tags
Pill-shaped, 18px tall, 12px semibold, in muted, orange-tint, success, warning or outlined tones. "In development" is an orange-outlined pill.

### Motion
Quiet and one-time. On load the hero content rises 14px with a fade (0.8s, cubic-bezier(0.16, 1, 0.3, 1), the laptop delayed 0.12s). Gated by `prefers-reduced-motion: no-preference`; content is visible by default. Hover transitions are color only; the FAQ icon rotates over 200ms.

## Do's and Don'ts

### Do:
- **Do** use the semantic utilities (`bg-muted`, `text-muted-foreground`, `border-border-strong`, `text-primary-text`) so the `.marketing` scope, light and dark, controls the palette.
- **Do** use Deep Terracotta (#a93a03) for any orange text on white, sand or tint.
- **Do** show the product honestly: a real screenshot in the laptop mockup for the hero, authored app windows with invented, labelled sample data and a visible caption elsewhere.
- **Do** keep h1/h2/h3 in Manrope 800 with the tight tracking listed above and balanced wrapping.
- **Do** alternate white and sand grounds, and close with the flat orange band.
- **Do** supply a light and a dark asset for any screenshot, and test both themes.
- **Do** show unfinished things honestly ("In development", "Pro is still being shaped"); no prices, stats, testimonials or integrations that do not exist.

### Don't:
- **Don't** place Ember (#f28c38) on a page band; the final band is Thread Orange.
- **Don't** add a second connective motif, gradient text, glows or decorative shadows to page furniture; the hero ground is dots only.
- **Don't** use Thread Orange (#c74504) as text on a light ground.
- **Don't** hard-code light-only hex values in marketing components; they break the dark theme.
- **Don't** import app-only values (#1c1917 text, 14px base) into marketing pages, or marketing values into the app.

## Not canonized (build carries, system does not inherit)

- The hero badge ("Five tools live / See what's inside") is a pill label sitting above the h1, which works as a kicker. It is a defect the build carries; new pages do not place a small label above a heading.
- Small uppercase tracked labels ("Tools" sidebar title, panel titles in `mockups/persona.tsx`) mirror product UI inside previews; not a heading pattern for the page.
- The Free plan's orange-tinted glow shadow (`0_18px_40px_-20px_#c7450466`) and arbitrary sizes such as `text-[12px]`, `text-[13px]`, `text-[15px]` are one-offs.
- Dead CSS in `marketing.css`: `.thread-line` / `thread-grow` (the hero thread was removed), and the `tone="charcoal"` Section variant with its Ember focus rule, are unused by any page.
- `--charcoal` and `--ember` are referenced in `globals.css` `@theme` but defined only under `.marketing`, so those utilities resolve to nothing outside it.
