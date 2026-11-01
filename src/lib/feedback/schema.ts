import { z } from "zod";

export const FEEDBACK_TYPES = {
  bug: { label: "Something is broken", labels: ["bug", "user-feedback"] },
  idea: { label: "An idea or request", labels: ["enhancement", "user-feedback"] },
  other: { label: "Something else", labels: ["question", "user-feedback"] },
} as const;

export type FeedbackType = keyof typeof FEEDBACK_TYPES;

const typeKeys = Object.keys(FEEDBACK_TYPES) as [FeedbackType, ...FeedbackType[]];

export const MIN_FEEDBACK_LENGTH = 10;
export const MAX_FEEDBACK_LENGTH = 2000;

export const feedbackSchema = z.object({
  type: z.enum(typeKeys, { error: "Choose what kind of feedback this is." }),
  message: z
    .string()
    .trim()
    .min(MIN_FEEDBACK_LENGTH, `Add a little more detail (at least ${MIN_FEEDBACK_LENGTH} characters).`)
    .max(MAX_FEEDBACK_LENGTH, `That's too long (maximum ${MAX_FEEDBACK_LENGTH.toLocaleString("en-US")} characters).`),
  /** Honeypot. Real visitors never see or fill it. */
  website: z.string().max(500).optional().default(""),
  /** When the widget was opened (ms epoch). Used to reject instant submissions. */
  openedAt: z.number().int().optional(),
});

export type FeedbackValues = z.input<typeof feedbackSchema>;

/** Fewest milliseconds a person could plausibly take to write feedback. */
export const MIN_FILL_MS = 2000;
/** More links than this reads as spam, not feedback. */
export const MAX_LINKS = 2;

export function countLinks(text: string) {
  return (text.match(/https?:\/\/|www\./gi) ?? []).length;
}
