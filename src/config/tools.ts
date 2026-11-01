import {
  ClipboardList,
  Lightbulb,
  Layers,
  Route,
  Target,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export type ToolStatus = "coming-soon" | "available";

export type ResearchTool = {
  slug: string;
  name: string;
  summary: string;
  icon: LucideIcon;
  status: ToolStatus;
  /** What the tool will help with. Shown on the coming-soon page. */
  plannedCapabilities: string[];
};

/**
 * Registry of research modules. Each future module flips `status` to
 * "available" and replaces the coming-soon page at /tools/[slug].
 */
export const researchTools: ResearchTool[] = [
  {
    slug: "research-planner",
    name: "Research Planner",
    summary: "Plan studies with clear goals, questions, methods and timelines.",
    icon: ClipboardList,
    status: "available",
    plannedCapabilities: [
      "Define research goals and questions",
      "Choose methods that fit your constraints",
      "Draft discussion guides and screeners",
    ],
  },
  {
    slug: "persona-builder",
    name: "Persona Builder",
    summary: "Turn what you know about users into evidence-based personas.",
    icon: UserRound,
    status: "available",
    plannedCapabilities: [
      "Capture goals, needs and pain points",
      "Link personas to research evidence",
      "Share personas with your team and clients",
    ],
  },
  {
    slug: "competitor-analyzer",
    name: "Competitor Analyzer",
    summary: "Compare competitors side by side and spot gaps in the market.",
    icon: Target,
    status: "available",
    plannedCapabilities: [
      "Build structured competitor profiles",
      "Compare features and experiences",
      "Summarise strengths, weaknesses and gaps",
    ],
  },
  {
    slug: "journey-mapper",
    name: "Journey Mapper",
    summary: "Map the customer journey from first touch to long-term use.",
    icon: Route,
    status: "available",
    plannedCapabilities: [
      "Lay out stages, actions and touchpoints",
      "Track emotions and pain points",
      "Highlight moments of opportunity",
    ],
  },
  {
    slug: "research-synthesizer",
    name: "Research Synthesizer",
    summary: "Gather notes and observations, then cluster them into insights.",
    icon: Layers,
    status: "available",
    plannedCapabilities: [
      "Collect notes from interviews and tests",
      "Group observations into themes",
      "Write insights backed by evidence",
    ],
  },
  {
    slug: "opportunity-analyzer",
    name: "Opportunity Analyzer",
    summary: "Prioritise opportunities by impact, effort and user value.",
    icon: Lightbulb,
    status: "coming-soon",
    plannedCapabilities: [
      "List and score opportunities",
      "Compare impact against effort",
      "Turn findings into a prioritised roadmap",
    ],
  },
];

export function getTool(slug: string) {
  return researchTools.find((tool) => tool.slug === slug);
}
