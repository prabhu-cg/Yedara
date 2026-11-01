import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

export const alt = `${siteConfig.name}: Better insights. Stronger decisions.`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
          background: "#333333",
          color: "#faf9f6",
          padding: 80,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 40, fontWeight: 800 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "#c74504" }} />
          {siteConfig.name}
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 104, fontWeight: 800, lineHeight: 1, letterSpacing: -4 }}>
          <span>Better insights.</span>
          <span style={{ color: "#f28c38" }}>Stronger decisions.</span>
        </div>
        <div style={{ fontSize: 32, color: "#d2ccc1", display: "flex" }}>{`${siteConfig.tagline} A connected UX research workspace.`}</div>
      </div>
    ),
    size,
  );
}
