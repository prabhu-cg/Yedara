# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Designers, UX researchers, agencies and product teams (the app's own copy names freelance designers, independent researchers, startups and small agencies). They plan a study, collect notes by hand, and need to defend decisions to clients or stakeholders with evidence.

## Product Purpose
Yedara is a connected UX research workspace. It helps people plan research, understand users, analyse competitors, synthesise findings and identify opportunities, in one project, with evidence staying attached from raw observation to recommendation. Tagline: Know. Explore. Understand. Core message: Better insights. Stronger decisions.

## Positioning
The modules share one project brief and one chain of evidence: observations link to insights, insights and observations link to journey pain points, journey opportunities hand on to the Opportunity Analyzer. Nothing is generated or invented (no AI output today); personas are labelled research-backed / hypothesis / proto-persona and use initials unless the researcher opts into one of 12 illustrative stock portraits, which is always captioned "Illustrative stock photo. Not a real participant." in the app and in every export; unknown matrix cells are research gaps, not weaknesses.

## Capabilities and Constraints
Live modules: Research Planner, Persona Builder, Competitor Analyzer, Research Synthesizer, Journey Mapper. Opportunity Analyzer is in development (journeys already hand opportunities on to it). Exports: PDF, Word and Markdown for planner, personas, competitor analyses and syntheses; no journey export yet. Text files (.txt .md .csv .tsv) are read in the browser and never uploaded. Auth is Supabase (email + password). There is NO billing, no plans table and no prices. Free is the only live plan. Pro does not exist yet: shown as in development, no price, with the Feedback widget as its enquiry route. Stack: Next.js 16 App Router, Tailwind 4, Supabase, deployed on Vercel.

## Brand Commitments
The Butter system, shared with Doxa (see DESIGN.md): Newsreader for headlines and DM Sans for everything else; amber #E8B923 is the one accent and the call-to-action colour, ochre #826400 when the accent is text, charcoal #353335 on amber, white paper on a butter desk #FCFAF3. The logo and favicon are two wings: the left wing is the CTA amber in both themes and the right wing is dark grey #444444 (lightened in dark mode so it stays visible) (public/brand/yedara-logo.svg, src/app/icon.svg, LogoMark component). The app has exactly two themes, light (default) and dark, with a sun/moon toggle and no system option. Tone: modern, minimal, professional SaaS. The sign-in and sign-up screens carry one photograph, a research team's affinity wall (public/auth/panel.jpg, Christian Brok on Unsplash, Unsplash License), under a flat charcoal scrim. It shows notes, never faces, and is atmosphere, not proof.

## Evidence on Hand
No customers, testimonials, usage statistics, integrations, benchmarks or performance numbers exist and none may be invented. Product UI previews are authored mockups labelled as sample data. Persona portraits are optional stock photographs (Unsplash, no attribution required) and are never presented as a real participant. The auth-panel photograph is a stock image of a real affinity wall and is never presented as a Yedara customer or study. Tracking: no analytics or advertising cookies; only the Supabase session cookies (necessary) and a light/dark theme preference in localStorage. Legal entity name and address are not recorded. The About page's "Who built Yedara, and why" section is first-person from the independent builder (Prabhu Raja), with a portfolio link and the builder's email as the one private contact line (Privacy and Terms point to it). There is no contact page. Visitors can also use the Feedback widget, which files a public GitHub issue and collects no name or email.

## Product Principles
1. Evidence stays attached.
2. Say what is unknown instead of filling the gap.
3. Show the real product doing its job; never fabricate proof.
4. Marketing is public, separate from the app, and every link goes somewhere real.

## Accessibility & Inclusion
WCAG AA contrast, keyboard navigation, visible focus, responsive from mobile to desktop, reduced-motion respected.

## Marketing Surface (current)

- About, Privacy and Terms share one layout, exactly Doxa's: desk ground, a `max-w-3xl` column, a Newsreader title, and a single white card of sections. About has a small "V1" badge and a subtitle (the tagline); Privacy and Terms are titled "Privacy Policy" and "Terms of Service" with a "Last updated" line and no badge.
- About's sections: What it is; How it is built (a two-column definition grid of the real stack, same format as Doxa's: Framework, Styling, Icons & Type, Forms & Validation, Data, Identity, Exports, Hosting); What is live, and what is next; Who built Yedara, and why (first person, Prabhu Raja, portfolio link, email).
- The features page has a sticky in-page index of the six tools (see DESIGN.md, Features index). It is a navigation aid, not decoration: motion explains where you are and where a click went.
- Drawers (create, edit and in-workspace forms) and the delete dialog follow Doxa's chrome: desk header and footer bar around a paper body. Dialogs interrupt only for destructive confirmations. The segmented controls (project research filter and view toggle, the Synthesizer material views) use butter selection on a paper track.
- Every research tool page names its parent project with a link back to it (the project chip), because the same person often has several projects open and a persona or journey is meaningless without knowing whose it is.
