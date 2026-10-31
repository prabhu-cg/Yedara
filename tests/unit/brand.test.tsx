// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LogoMark } from "@/components/brand/logo-mark";
import { siteConfig } from "@/config/site";

const root = path.resolve(import.meta.dirname, "../..");
const pathData = (svg: string) => [...svg.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1]);

const original = readFileSync(path.join(root, "public/brand/yedara-logo.svg"), "utf8");
const icon = readFileSync(path.join(root, "src/app/icon.svg"), "utf8");

describe("brand assets", () => {
  it("the original logo is the two-wing mark in the brand colours", () => {
    expect(pathData(original)).toHaveLength(2);
    expect(original).toContain('fill="#C74504"');
    expect(original).toContain('fill="#444444"');
  });

  it("the favicon carries exactly the original artwork", () => {
    expect(pathData(icon)).toEqual(pathData(original));
  });

  it("the favicon lightens the dark wing for dark browser themes", () => {
    expect(icon).toMatch(/prefers-color-scheme:\s*dark/);
    expect(icon).toContain("#C74504");
  });

  it("the inline mark carries exactly the original artwork", () => {
    const { container } = render(<LogoMark />);
    const paths = [...container.querySelectorAll("path")].map((p) => p.getAttribute("d"));
    expect(paths).toEqual(pathData(original));
    expect(container.querySelector("svg")).toHaveAttribute("viewBox", "0 0 128 128");
  });

  it("the mark is decorative and each wing carries its own colour", () => {
    const { container } = render(<LogoMark className="size-9" />);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveClass("size-9");
    // Regression: the root must not be `fill="none"` with colours supplied only by utility classes,
    // or a stale stylesheet leaves a wing invisible.
    expect(svg).not.toHaveAttribute("fill", "none");
    const [ink, accent] = container.querySelectorAll("path");
    expect(ink).toHaveAttribute("fill", "#444444");
    expect(accent).toHaveAttribute("fill", "#C74504");
    // ...and follows the theme through CSS variables.
    expect(ink.getAttribute("style")).toContain("var(--brand-ink");
    expect(accent.getAttribute("style")).toContain("var(--primary");
  });

  it("has a white variant for the dark brand panel", () => {
    const { container } = render(<LogoMark variant="white" />);
    const [right, left] = container.querySelectorAll("path");
    expect(left).toHaveAttribute("fill", "white");
    expect(right).toHaveAttribute("fill", "white");
    expect(right).toHaveAttribute("fill-opacity", "0.7");
  });
});

describe("site identity", () => {
  it("uses the agreed tagline", () => {
    expect(siteConfig.tagline).toBe("Know. Explore. Understand.");
    expect(siteConfig.name).toBe("Yedara");
    expect(siteConfig.descriptor).toBe("Research Workspace");
  });
});

describe("favicon files", () => {
  const sharpPromise = import("sharp");
  const ico = readFileSync(path.join(root, "src/app/favicon.ico"));

  /** Decode each PNG image inside the .ico. */
  const entries = Array.from({ length: ico.readUInt16LE(4) }, (_, i) => {
    const at = 6 + 16 * i;
    const size = ico.readUInt32LE(at + 8);
    const offset = ico.readUInt32LE(at + 12);
    return { width: ico.readUInt8(at) || 256, png: ico.subarray(offset, offset + size) };
  });

  it("is a valid .ico with 16, 32 and 48px images", () => {
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(entries.map((e) => e.width)).toEqual([16, 32, 48]);
    for (const e of entries) expect(e.png.subarray(1, 4).toString()).toBe("PNG");
  });

  it("shows both wings on a solid backing, so it reads as the full logo on dark tabs", async () => {
    const sharp = (await sharpPromise).default;
    for (const e of entries.filter((x) => x.width >= 32)) {
      const { data, info } = await sharp(e.png).raw().toBuffer({ resolveWithObject: true });
      const at = (xf: number, yf: number) => {
        const i = (Math.round(yf * info.height) * info.width + Math.round(xf * info.width)) * info.channels;
        return [...data.subarray(i, i + info.channels)];
      };
      // A point inside each wing (the left is terracotta, the right is the ink) and the tile behind them.
      const [lr, lg, lb, la] = at(0.33, 0.4);
      const [rr, rg, rb, ra] = at(0.67, 0.4);
      expect([lr, lg, lb, la]).toEqual([199, 69, 4, 255]);
      expect([rr, rg, rb, ra]).toEqual([68, 68, 68, 255]);
      // The gap between and around the wings is opaque white, never transparent.
      expect(at(0.5, 0.22)[3]).toBe(255);
      expect(at(0.12, 0.5).slice(0, 3)).toEqual([255, 255, 255]);
    }
  });
});
