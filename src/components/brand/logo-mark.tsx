import {
  LOGO_ACCENT_HEX,
  LOGO_INK_HEX,
  LOGO_VIEWBOX,
  LOGO_WING_ACCENT,
  LOGO_WING_INK,
} from "@/components/brand/logo-paths";
import { cn } from "@/lib/utils";

/**
 * The Yedara mark (from Yedara_logo.svg).
 *
 * The left wing is the CTA amber (the primary-button colour, the same in light and dark); the right
 * wing is dark grey, lightened in dark mode so it stays visible. Each wing carries its brand value as
 * the `fill` attribute (so the logo can never render invisible), overridden by the theme variable.
 * It deliberately does not rely on generated utility classes. `white` is for the photographic brand
 * panel, where both wings sit on a charcoal scrim.
 */
export function LogoMark({
  className,
  variant = "color",
}: {
  className?: string;
  variant?: "color" | "white";
}) {
  const white = variant === "white";
  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0", className)}
    >
      <path
        d={LOGO_WING_INK}
        fill={white ? "white" : LOGO_INK_HEX}
        fillOpacity={white ? 0.7 : undefined}
        style={white ? undefined : { fill: "var(--brand-ink, " + LOGO_INK_HEX + ")" }}
      />
      <path
        d={LOGO_WING_ACCENT}
        fill={white ? "white" : LOGO_ACCENT_HEX}
        style={white ? undefined : { fill: "var(--primary, " + LOGO_ACCENT_HEX + ")" }}
      />
    </svg>
  );
}
