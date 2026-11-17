import type { Metadata } from "next";
import { LEGAL_UPDATED, LegalPageShell, LegalSections, type LegalSection } from "@/components/marketing/legal";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms for using Yedara, the UX research workspace.",
  alternates: { canonical: "/terms" },
  openGraph: { title: "Yedara terms of service", url: "/terms" },
};

const SECTIONS: LegalSection[] = [
  {
    id: "acceptance",
    title: "1. Acceptance",
    body: [
      "By using Yedara you agree to these terms. If you do not agree with them, please don't use the service. If you use Yedara for an organisation, you confirm you can accept these terms on its behalf.",
    ],
  },
  {
    id: "the-service",
    title: "2. The service",
    body: [
      "Yedara is a hosted UX research workspace for planning research, building personas, analysing competitors, synthesising findings, mapping empathy and mapping journeys. It requires an account, and the content you add is stored on our servers rather than on your device.",
    ],
  },
  {
    id: "accounts-and-content",
    title: "3. Accounts and content",
    body: [
      "You're responsible for keeping your password safe and for activity under your account. Give us accurate details and tell us promptly if you think your account has been accessed without permission.",
      "You own the research content you put into Yedara. You give us permission to store, process and display it only so we can run the service for you, including producing the exports you request.",
      "You are responsible for having the right to use what you add, including the consent of research participants. We recommend participant codes instead of names, and not adding sensitive personal data you don't need.",
    ],
  },
  {
    id: "availability-and-data",
    title: "4. Availability and data",
    body: [
      "We take reasonable steps to keep the service available and your data safe, but Yedara is provided without a guarantee of uninterrupted access. Keep your own copy of anything you can't afford to lose, for example by using the PDF, Word and Markdown exports.",
    ],
  },
  {
    id: "provided-as-is",
    title: "5. Provided as is",
    body: [
      "Yedara is provided “as is” and “as available”, without warranty of any kind, express or implied, including fitness for a particular purpose. We don't warrant that the service will be uninterrupted or error-free, or that anything produced in Yedara is a substitute for your own research judgement.",
    ],
  },
  {
    id: "acceptable-use",
    title: "6. Acceptable use",
    body: [
      "You agree not to use Yedara to:",
      [
        "break any applicable law or infringe anyone's rights,",
        "access, or attempt to access, other people's data without authorisation,",
        "send spam or automated bulk requests through the site or the Feedback button,",
        "disrupt or attempt to compromise the infrastructure that runs the service, or reverse engineer or resell it without our written agreement.",
      ],
    ],
  },
  {
    id: "plans",
    title: "7. Plans",
    body: [
      "The Free plan is available now. A Pro plan is in development and is not for sale. If we introduce paid plans we will publish the price and what is included before anything can be bought, and these terms will be updated to cover them.",
    ],
  },
  {
    id: "changes",
    title: "8. Changes",
    body: [
      "Yedara is actively developed, and features, including the Opportunity Analyzer, may change, appear or be withdrawn. These terms may also be updated as the product develops. Material changes will be communicated before they take effect, and continued use after a change constitutes acceptance of it.",
    ],
  },
  {
    id: "ending",
    title: "9. Ending your use",
    body: [
      "You can stop using Yedara at any time. We may suspend or end an account that breaks these terms or puts the service or other people at risk.",
    ],
  },
  {
    id: "liability",
    title: "10. Limitation of liability",
    body: [
      "To the fullest extent permitted by law, we are not liable for any indirect, incidental or consequential loss, or for any loss of data, profit, revenue or business, arising from your use of or inability to use Yedara, or for decisions made using research produced with it. Nothing in these terms excludes liability that can't lawfully be excluded.",
    ],
  },
  {
    id: "governing-law",
    title: "11. Governing law",
    body: [
      "These terms are governed by the laws of the jurisdiction in which the operator of Yedara is established. Any dispute is subject to the exclusive jurisdiction of its courts.",
    ],
  },
  {
    id: "contact",
    title: "12. Contact",
    body: [
      "Questions about these terms can be sent to the email address on the About page, or through the Feedback button. Feedback is public, so leave out personal details.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms of Service" updated={LEGAL_UPDATED}>
      <LegalSections sections={SECTIONS} />
    </LegalPageShell>
  );
}
