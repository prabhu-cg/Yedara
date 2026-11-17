import type { Metadata } from "next";
import { LEGAL_UPDATED, LegalPageShell, LegalSections, type LegalSection } from "@/components/marketing/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What Yedara collects, why, who processes it, and the cookies it uses.",
  alternates: { canonical: "/privacy" },
  openGraph: { title: "Yedara privacy policy", url: "/privacy" },
};

const SECTIONS: LegalSection[] = [
  {
    id: "short-version",
    title: "The short version",
    body: [
      "Yedara collects the information needed to run an account and a research workspace, and nothing more. We don't sell personal information, we don't run ad trackers on this site or in the product, and nothing you write is sent to an AI service.",
    ],
  },
  {
    id: "what-we-collect",
    title: "What we collect",
    body: [
      [
        "Account information you provide: your name and email address, and optionally a job title and company. Passwords are handled by our authentication provider and are not readable by us.",
        "Your research content: the projects, plans, personas, competitor analyses, observations, insights and journeys you create.",
        "Feedback you send through the Feedback button: its type and text. It is posted as a public issue on GitHub, and Yedara doesn't ask for your name or email address with it.",
        "Basic technical information, such as IP address and timestamps, needed to operate and secure the service.",
      ],
      "We don't collect payment details. There is nothing to buy today.",
    ],
  },
  {
    id: "how-its-used",
    title: "How it's used",
    body: [
      "To sign you in and keep your workspace secure, to show your research content back to you and produce the exports you ask for, and to fix problems and decide what to build. We do not use your content to train models or to advertise to you.",
    ],
  },
  {
    id: "where-your-data-lives",
    title: "Where your data lives",
    body: [
      "Yedara runs on Vercel and stores data in Supabase (PostgreSQL). Data in transit is encrypted via HTTPS. Your research content is private to your account: access rules in the database stop one account reading another's projects.",
      "Text files you import (.txt, .md, .csv, .tsv) are read in your browser and are never uploaded. Only the text you review and confirm is saved, along with the file's name and size.",
    ],
  },
  {
    id: "cookies",
    title: "Cookies and tracking",
    body: [
      "Yedara sets only the storage it needs to work, so there is no cookie banner to accept:",
      [
        "Sign-in session cookies, set by Supabase Auth when you sign in. They keep you signed in and are strictly necessary.",
        "A theme preference (light or dark) saved in your browser's local storage if you change it. It never leaves your device.",
      ],
      "We don't run advertising pixels, third-party trackers, analytics or session-recording scripts. If we add any non-essential tracking in future, we will update this policy and ask for your consent first.",
    ],
  },
  {
    id: "sharing",
    title: "Data sharing and subprocessors",
    body: [
      "Yedara does not sell personal information. The infrastructure providers that process data on our behalf are currently Vercel (hosting, which may keep standard request logs including IP addresses) and Supabase (database and authentication), and each is bound by its own data processing terms.",
      "We also use your IP address briefly, in memory, to limit repeated sign-in and feedback attempts. It is not stored with your account.",
    ],
  },
  {
    id: "retention-and-rights",
    title: "Data retention and your rights",
    body: [
      "We keep your account and research content until you delete it or ask us to. Feedback is kept as a public GitHub issue for as long as we need it, and may stay visible in GitHub's history.",
      "You can edit your profile and delete your projects and research items inside Yedara. You can also ask for export, correction or deletion of your personal data and account by emailing the address on the About page. Feedback is public, so don't put personal details in it.",
    ],
  },
  {
    id: "research-notes",
    title: "Your research notes",
    body: [
      "Research notes can contain personal information about your participants. We recommend participant codes instead of names.",
    ],
  },
  {
    id: "children",
    title: "Children",
    body: ["Yedara is a professional tool and isn't directed at children. We don't knowingly collect information from anyone under 16."],
  },
  {
    id: "changes",
    title: "Changes and contact",
    body: [
      "If this policy changes, the date at the top of this page will be updated and, where it matters, we will tell you inside the app. Questions about this policy can be sent to the email address on the About page.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy" updated={LEGAL_UPDATED}>
      <LegalSections sections={SECTIONS} />
    </LegalPageShell>
  );
}
