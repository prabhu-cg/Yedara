import type { Metadata } from "next";
import { LegalDocument, type LegalSection } from "@/components/marketing/legal";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What Yedara collects, why, who processes it, and the cookies it uses.",
  alternates: { canonical: "/privacy" },
  openGraph: { title: "Yedara privacy policy", url: "/privacy" },
};

const SECTIONS: LegalSection[] = [
  {
    id: "what-we-collect",
    title: "What we collect",
    body: [
      "We collect only what the service needs to work:",
      [
        "Account details: your name, email address and password. Passwords are handled by our authentication provider and are not readable by us. You may also add a job title and company.",
        "Your research content: the projects, plans, personas, competitor analyses, observations, insights and journeys you create.",
        "Feedback: the type and text you send through the Feedback button. It is posted as a public issue on GitHub, and Yedara does not ask for your name or email address with it.",
      ],
      "We do not collect payment details. There is nothing to buy today.",
    ],
  },
  {
    id: "how-we-use-it",
    title: "How we use it",
    body: [
      "We use your account details to sign you in and keep your workspace secure, your research content to show it back to you and produce the exports you ask for, and feedback to fix problems and decide what to build.",
      "We do not sell your data, use it for advertising, or use your research content to train models. Nothing you write is sent to an AI service.",
    ],
  },
  {
    id: "cookies",
    title: "Cookies and similar storage",
    body: [
      "Yedara sets only the storage it needs to work. We do not use analytics, advertising or tracking cookies, so there is no cookie banner to accept.",
      [
        "Sign-in session cookies, set by our authentication provider when you sign in. They keep you signed in and are strictly necessary.",
        "A theme preference (light, dark or system) saved in your browser’s local storage if you change it inside the app. It never leaves your device.",
      ],
      "If we add analytics or any other non-essential tracking in future, we will update this policy and ask for your consent first.",
    ],
  },
  {
    id: "research-notes",
    title: "Your research notes",
    body: [
      "Research notes can contain personal information about your participants. We recommend participant codes instead of names. Your research content is private to your account: other users cannot read it.",
      "Text files you import (.txt, .md, .csv, .tsv) are read in your browser and are never uploaded. Only the text you review and confirm is saved, along with the file’s name and size.",
    ],
  },
  {
    id: "who-processes-it",
    title: "Who processes your data",
    body: [
      "We use a small number of service providers to run Yedara:",
      [
        "Supabase, for the database and authentication, which stores your account and research content.",
        "Vercel, for hosting the website and application, which may keep standard request logs including IP addresses.",
      ],
      "We also use your IP address briefly, in memory, to limit repeated sign-in and feedback attempts. It is not stored with your account.",
    ],
  },
  {
    id: "retention",
    title: "How long we keep it",
    body: [
      "We keep your account and research content until you delete it or ask us to. Feedback is kept as a public GitHub issue for as long as we need it, and may stay visible in GitHub's history.",
    ],
  },
  {
    id: "your-rights",
    title: "Your choices and rights",
    body: [
      "You can edit your profile and delete your projects and research items inside Yedara. Depending on where you live, you may also have the right to access, correct, export or delete your personal data, or to object to how it is used.",
      "Yedara does not yet have a private way to reach us. Feedback is public, so do not put personal details in it. A private contact route for these requests will be added here.",
    ],
  },
  {
    id: "children",
    title: "Children",
    body: ["Yedara is built for professionals and is not directed at children under 16. We do not knowingly collect their data."],
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: ["If we change this policy in a way that matters, we will update the date at the top and, where appropriate, tell you inside the app."],
  },
];

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy policy"
      intro="Yedara is a research workspace, and research can be sensitive. This page explains in plain language what we collect, why, and who helps us run the service."
      sections={SECTIONS}
    />
  );
}
