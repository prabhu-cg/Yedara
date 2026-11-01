import type { Metadata } from "next";
import { LegalDocument, type LegalSection } from "@/components/marketing/legal";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The terms for using Yedara, the UX research workspace.",
  alternates: { canonical: "/terms" },
  openGraph: { title: "Yedara terms of service", url: "/terms" },
};

const SECTIONS: LegalSection[] = [
  {
    id: "agreement",
    title: "Agreement",
    body: [
      "By creating an account or using Yedara you agree to these terms. If you do not agree, please do not use the service. If you use Yedara for an organisation, you confirm you can accept these terms on its behalf.",
    ],
  },
  {
    id: "your-account",
    title: "Your account",
    body: [
      "You are responsible for keeping your password safe and for what happens under your account. Give us accurate details and tell us promptly if you think your account has been accessed without permission.",
    ],
  },
  {
    id: "your-content",
    title: "Your content",
    body: [
      "You own the research content you put into Yedara. You give us permission to store, process and display it only so we can run the service for you, including producing the exports you request.",
      "You are responsible for having the right to use what you add, including the consent of research participants. We recommend participant codes instead of names, and not adding sensitive personal data you do not need.",
    ],
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    body: [
      "Do not use Yedara to:",
      [
        "break the law or infringe anyone’s rights,",
        "attempt to access other people’s data or disrupt the service,",
        "send spam or automated bulk requests through the site or the feedback button,",
        "reverse engineer or resell the service without our written agreement.",
      ],
    ],
  },
  {
    id: "plans",
    title: "Plans",
    body: [
      "The Free plan is available now. A Pro plan is in development and is not for sale. If we introduce paid plans we will publish the price and what is included before anything can be bought, and these terms will be updated to cover them.",
    ],
  },
  {
    id: "service-changes",
    title: "The service as it is",
    body: [
      "Yedara is actively developed. Features, including the Opportunity Analyzer, may change, appear or be withdrawn. We work to keep the service available and your data safe, but we do not promise it will always be uninterrupted or error free. Keep your own copy of anything you cannot afford to lose, for example by using the export options.",
    ],
  },
  {
    id: "ending",
    title: "Ending your use",
    body: [
      "You can stop using Yedara at any time. We may suspend or end an account that breaks these terms or puts the service or other people at risk.",
    ],
  },
  {
    id: "liability",
    title: "Our responsibility",
    body: [
      "The service is provided as is. To the extent the law allows, we are not liable for indirect or consequential losses, or for decisions made using research produced with Yedara. Nothing in these terms limits any right or liability that cannot be limited by law.",
    ],
  },
  {
    id: "changes",
    title: "Changes and contact",
    body: [
      "We may update these terms. When we do, we will change the date at the top, and continued use after that means you accept the update. Questions about these terms can be sent with the Feedback button. Feedback is public, so leave out personal details.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of service"
      intro="These are the rules for using Yedara. We have kept them short and readable."
      sections={SECTIONS}
    />
  );
}
