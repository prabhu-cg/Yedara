import { ImageResponse } from "next/og";
import { LOGO_VIEWBOX, LOGO_WING_ACCENT, LOGO_WING_INK } from "@/components/brand/logo-paths";
import { siteConfig } from "@/config/site";

export const alt = `${siteConfig.name}: Better insights. Stronger decisions.`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The social card is rendered to a PNG without CSS, so it carries its own copy of the Butter palette:
 * the desk ground, charcoal ink, the two-wing mark (dark grey and amber) and one ochre phrase.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#fcfaf3",
          color: "#353335",
          padding: 80,
          borderTop: "12px solid #e8b923",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 44, fontWeight: 700 }}>
          <svg width="56" height="56" viewBox={LOGO_VIEWBOX} fill="none">
            <path d={LOGO_WING_INK} fill="#444444" />
            <path d={LOGO_WING_ACCENT} fill="#e8b923" />
          </svg>
          {siteConfig.name}
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 104, fontWeight: 500, lineHeight: 1.02, letterSpacing: -3 }}>
          <span>Better insights.</span>
          <span style={{ color: "#826400" }}>Stronger decisions.</span>
        </div>
        <div style={{ fontSize: 32, color: "#6b6b6b", display: "flex" }}>{`${siteConfig.tagline} A connected UX research workspace.`}</div>
      </div>
    ),
    size,
  );
}
