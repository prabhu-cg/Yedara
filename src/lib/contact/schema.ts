import { z } from "zod";

export const CONTACT_TOPICS = [
  { value: "general", label: "General question" },
  { value: "support", label: "Help with my account" },
  { value: "pro", label: "The Pro plan" },
  { value: "feedback", label: "Feedback or a feature idea" },
  { value: "partnership", label: "Working together" },
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number]["value"];

const topicValues = CONTACT_TOPICS.map((t) => t.value) as [ContactTopic, ...ContactTopic[]];

export function isContactTopic(value: unknown): value is ContactTopic {
  return typeof value === "string" && (topicValues as string[]).includes(value);
}

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(120, "Keep your name under 120 characters."),
  email: z.email("Enter a valid email address.").max(254, "That email address is too long."),
  topic: z.enum(topicValues, { error: "Choose a topic." }),
  message: z
    .string()
    .trim()
    .min(10, "Write at least a sentence so we can help.")
    .max(4000, "Keep your message under 4,000 characters."),
  /** Honeypot. Real visitors never see or fill it. */
  website: z.string().max(500).optional().default(""),
  /** When the form was shown (ms epoch). Used to reject instant submissions. */
  openedAt: z.number().int().optional(),
});

export type ContactValues = z.input<typeof contactSchema>;

/** Fewest milliseconds a person could plausibly take to write a message. */
export const MIN_FILL_MS = 3000;
/** More links than this reads as spam, not a question. */
export const MAX_LINKS = 2;

export function countLinks(text: string) {
  return (text.match(/https?:\/\/|www\./gi) ?? []).length;
}
