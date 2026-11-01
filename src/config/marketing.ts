import { ClipboardList, Layers, Lightbulb, Route, Target, UserRound, type LucideIcon } from "lucide-react";

/** Everything the public site says about the product. Facts here mirror what the app does today. */

export const PRIMARY_NAV = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
] as const;

export type MarketingModule = {
  slug: string;
  name: string;
  icon: LucideIcon;
  /** The one-line promise, used as the section heading. */
  headline: string;
  summary: string;
  /** Short specifics shown on the homepage. */
  points: string[];
  /** Longer, exact specifics shown on /features. */
  details: string[];
  status: "available" | "in-development";
  phase: "Plan" | "Research" | "Understand" | "Prioritise";
};

export const MODULES: MarketingModule[] = [
  {
    slug: "research-planner",
    name: "Research Planner",
    icon: ClipboardList,
    headline: "Plan the study before you run it.",
    summary:
      "A guided seven-step plan that turns your project brief into goals, methods, participants, materials and logistics.",
    points: [
      "Context, goals, methods, participants, materials, logistics, review",
      "Method guidance is a suggestion, always optional",
      "Export to PDF, Word or Markdown",
    ],
    details: [
      "Seven steps: context, goals, methods, participants, materials, logistics and review. It autosaves, so you can leave and resume.",
      "Method guidance matches your goals to research methods. It only suggests, labels every suggestion optional, and never selects anything for you.",
      "Starter materials are drafted from your own answers and only for the methods you chose. They use [bracketed] placeholders for what only you can know.",
      "One document model drives the preview and the PDF, Word and Markdown exports, so they never disagree.",
    ],
    status: "available",
    phase: "Plan",
  },
  {
    slug: "persona-builder",
    name: "Persona Builder",
    icon: UserRound,
    headline: "Personas that say how much they know.",
    summary:
      "Build personas from evidence, and see on the page whether each is research-backed, a hypothesis or a proto-persona.",
    points: [
      "Every persona carries an honest status label",
      "Quotes need a source; demographics need a reason",
      "Compare up to four personas side by side",
    ],
    details: [
      "Six steps: context, profile, behaviour, needs, evidence and output. Keep several personas per project, duplicate them, and edit any time.",
      "Each persona is labelled research-backed, hypothesis or proto-persona, on screen and in every export. A research-backed persona needs a research source plus an observation or quote.",
      "Every quote needs a source. Demographics only appear when you record why they matter. Initials stand in for photos, so nobody is represented by a stranger's face.",
      "Compare up to four personas side by side, and export to PDF, Word or Markdown.",
    ],
    status: "available",
    phase: "Research",
  },
  {
    slug: "competitor-analyzer",
    name: "Competitor Analyzer",
    icon: Target,
    headline: "Compare competitors without guessing.",
    summary:
      "A competitor-by-criteria matrix where unknown stays unknown, every source is cited, and gaps become research to do.",
    points: [
      "Cells are known, unknown, not publicly available or not applicable",
      "Sources record a URL and the date you retrieved it",
      "Gaps are reported as research to do, not as weaknesses",
    ],
    details: [
      "Six steps: market context, competitors, criteria, comparison matrix, analysis and report. Competitors are typed as direct, indirect, substitute or emerging.",
      "Each cell is known (with a value), unknown (not yet researched), not publicly available (you looked and found nothing) or not applicable, with an optional note and source.",
      "Sources record their URL and the date they were retrieved. The report cites them as S1, S2 and lists them at the end.",
      "Strengths, weaknesses and opportunities are labelled as your interpretation, not recorded fact. All research is entered by hand.",
    ],
    status: "available",
    phase: "Research",
  },
  {
    slug: "research-synthesizer",
    name: "Research Synthesizer",
    icon: Layers,
    headline: "From raw notes to cited insights.",
    summary:
      "Collect observations, cluster them on an affinity board, and write insights that cannot exist without evidence.",
    points: [
      "Import notes and text files, reviewed before anything is saved",
      "Drag cards into themes, with keyboard support and undo",
      "Every insight links to at least one observation",
    ],
    details: [
      "Add a statement, paste notes, or import a .txt, .md, .csv or .tsv file. You see how it was split and confirm before anything is saved. Files are read in your browser and never uploaded.",
      "The affinity board puts themes beside a Not grouped yet column. Drag by pointer or keyboard, or use each card's Move to menu. Undo and redo cover board changes.",
      "An insight needs at least one piece of evidence, enforced on the server. Each is marked as a direct observation, research interpretation, hypothesis or recommendation.",
      "The report numbers observations O1, O2 and cites them from insights. Export to PDF, Word or Markdown.",
    ],
    status: "available",
    phase: "Understand",
  },
  {
    slug: "journey-mapper",
    name: "Journey Mapper",
    icon: Route,
    headline: "See the experience, stage by stage.",
    summary:
      "Map stages, actions, emotions and pain points, tie them back to what you observed, and flag opportunities.",
    points: [
      "Emotion curve that breaks at unrated stages",
      "Visual map, structured table and presentation views",
      "Pain points link to observations; flag them as opportunities",
    ],
    details: [
      "Journeys belong to a project and optionally one of its personas. Choose customer, user, service or employee, and current or future state. Copy a journey, or copy it as a future-state journey.",
      "Each stage has an emotion from very negative to very positive, or not rated, and holds actions, goals, thoughts, touchpoints, channels, pain points and opportunities. Unrated stages break the curve instead of reading as neutral.",
      "Pain points, opportunities and evidence items can link to an observation from a synthesis. You can only link observations you own.",
      "Read it as a visual map, a structured table, or a presentation with one slide per stage. There is no journey export yet.",
    ],
    status: "available",
    phase: "Understand",
  },
  {
    slug: "opportunity-analyzer",
    name: "Opportunity Analyzer",
    icon: Lightbulb,
    headline: "Turn findings into a prioritised roadmap.",
    summary:
      "Score opportunities by impact and effort, and decide what to do first. In development, and already receiving what you flag in the Journey Mapper.",
    points: [
      "In development, not yet available",
      "Opportunities flagged in journeys are already saved for it",
      "Planned: scoring, impact against effort, a prioritised roadmap",
    ],
    details: [
      "The Opportunity Analyzer is in development and cannot be used yet.",
      "When you choose Add to opportunities on a journey pain point or opportunity, Yedara saves it with the journey and stage names, your evidence note and the linked observation, ready for this tool.",
      "Planned: list and score opportunities, compare impact against effort, and turn findings into a prioritised roadmap.",
    ],
    status: "in-development",
    phase: "Prioritise",
  },
];

export const WORKFLOW = [
  {
    phase: "Plan",
    line: "Decide what you need to learn, and how.",
    slugs: ["research-planner"],
  },
  {
    phase: "Research",
    line: "Know your users and your market.",
    slugs: ["persona-builder", "competitor-analyzer"],
  },
  {
    phase: "Understand",
    line: "Turn notes into themes, insights and journeys.",
    slugs: ["research-synthesizer", "journey-mapper"],
  },
  {
    phase: "Prioritise",
    line: "Choose what to act on first.",
    slugs: ["opportunity-analyzer"],
  },
] as const;

export function moduleBySlug(slug: string) {
  const found = MODULES.find((m) => m.slug === slug);
  if (!found) throw new Error(`Unknown module: ${slug}`);
  return found;
}

/** What one module hands the next. Each line is something the app really does. */
export const CONNECTIONS = [
  {
    from: "Project brief",
    to: "Planner, Personas, Competitors",
    text: "Write the brief once. Each tool reads it and can override any field for itself, without touching the project.",
  },
  {
    from: "Observation",
    to: "Insight",
    text: "An insight cannot be saved without at least one linked observation. Delete the evidence and the insight is flagged No evidence linked.",
  },
  {
    from: "Observation",
    to: "Journey",
    text: "Pain points and opportunities in a journey link to the observation behind them, so the map answers “how do we know?”.",
  },
  {
    from: "Journey",
    to: "Opportunity Analyzer",
    text: "Add to opportunities keeps the journey, the stage, your note and the evidence, ready for prioritising.",
  },
] as const;

export const DIFFERENTIATORS = [
  {
    title: "Evidence stays attached",
    text: "Observations, insights and journeys point at each other. Anyone reading a recommendation can follow it back to what a participant said.",
  },
  {
    title: "Unknown is a valid answer",
    text: "Competitor cells can be unknown, not publicly available or not applicable. Personas say whether they are research-backed or a hypothesis. Gaps are shown, not smoothed over.",
  },
  {
    title: "Nothing is made up for you",
    text: "Yedara does not generate findings, quotes or personas. What you read in a report is what you entered, organised and cited.",
  },
  {
    title: "Documents you can hand over",
    text: "Research plans, personas, competitor analyses and synthesis reports export to PDF, Word and Markdown from the same document you see on screen.",
  },
  {
    title: "Your notes stay in your account",
    text: "Research data is private to your account. Text files are read in your browser and never uploaded; only the text you confirm is saved.",
  },
] as const;

export const FAQS = [
  {
    q: "Who is Yedara for?",
    a: "Designers, researchers, agencies and product teams who plan and run their own user research and need to show the evidence behind a decision. It is built around small studies done by hand, not around a research operations team.",
  },
  {
    q: "Is it free?",
    a: "Yes. The Free plan is live and includes every available tool. Creating an account takes an email address and a password, and there is no payment step.",
  },
  {
    q: "What will Pro include?",
    a: "Pro is in development and is not available yet, so there is no price and nothing to buy. If there is something you would need from it, use the Feedback button to tell us.",
  },
  {
    q: "Does Yedara use AI to write my findings?",
    a: "No. Everything in a plan, persona, matrix, board or report is entered by you, and nothing you write is sent to an AI service. Our rule for any assistance we add later is that it must be labelled, must never invent evidence, and must never replace it.",
  },
  {
    q: "What can I export?",
    a: "Research plans, personas, competitor analyses and synthesis reports export to PDF, Word and Markdown. Journeys have a presentation view but no export yet.",
  },
  {
    q: "Where do my research notes live?",
    a: "In your account, visible only to you. Files you import (.txt, .md, .csv, .tsv) are read in your browser and never uploaded; only the text you confirm is saved. We recommend participant codes instead of names.",
  },
  {
    q: "Can my team work in the same project?",
    a: "Not yet. Projects are private to the account that created them. You can share the exports and the journey presentation view.",
  },
] as const;

export const PLANS = {
  free: {
    name: "Free",
    status: "Available now",
    blurb: "Everything Yedara can do today, for one account.",
    features: [
      "Research Planner, Persona Builder, Competitor Analyzer, Research Synthesizer and Journey Mapper",
      "Projects that share one brief across every tool",
      "PDF, Word and Markdown export",
      "No payment step to start",
    ],
    cta: { label: "Create a free account", href: "/signup" },
  },
  pro: {
    name: "Pro",
    status: "In development",
    blurb: "Not available yet. There is no price and nothing to buy.",
    features: [
      "Contents and pricing are not decided",
      "Tell us what you would need from it",
      "Pro cannot be bought today",
    ],
    cta: { label: "Tell us what you'd want", href: null },
  },
} as const;
