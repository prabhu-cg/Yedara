import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// `rounded-card` is a custom radius token; without this, tailwind-merge can't tell it
// conflicts with `rounded-2xl` etc., and the winner would be decided by CSS order.
const twMerge = extendTailwindMerge({
  extend: { classGroups: { rounded: [{ rounded: ["card"] }] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
