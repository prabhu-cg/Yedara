"use client";

import type { FeedbackType } from "@/lib/feedback/schema";

export const OPEN_FEEDBACK_EVENT = "yedara:open-feedback";

type OpenFeedbackProps = Omit<React.ComponentProps<"button">, "type"> & { feedbackType?: FeedbackType };

/** Opens the floating feedback widget from anywhere on the public site. */
export function OpenFeedback({ feedbackType, onClick, ...props }: OpenFeedbackProps) {
  return (
    <button
      type="button"
      {...props}
      onClick={(event) => {
        onClick?.(event);
        window.dispatchEvent(new CustomEvent(OPEN_FEEDBACK_EVENT, { detail: { type: feedbackType } }));
      }}
    />
  );
}
