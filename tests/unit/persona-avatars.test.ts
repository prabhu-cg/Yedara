import { existsSync, statSync } from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { AVATAR_LABEL, PERSONA_AVATARS, avatarSrc, getAvatar } from "@/lib/personas/avatars";
import { PERSONA_SECTION_KEYS } from "@/lib/personas/constants";
import { buildPersonaDocument } from "@/lib/personas/document";
import { emptyPersonaContent, normalizePersonaContent, type PersonaContent } from "@/lib/personas/schemas";
import { renderDocx } from "@/lib/research-planner/export/docx";
import { renderMarkdown } from "@/lib/research-planner/export/markdown";
import { renderPdf } from "@/lib/research-planner/export/pdf";

const content = (avatar: string): PersonaContent => {
  const c = Object.fromEntries(PERSONA_SECTION_KEYS.map((k) => [k, emptyPersonaContent(k)])) as PersonaContent;
  c.profile.avatar = avatar;
  return c;
};
const build = (avatar: string) =>
  buildPersonaDocument({
    persona: { name: "Maya", type: "hypothesis", status: "draft", updatedAt: "2026-10-31T10:00:00Z" },
    project: null,
    content: content(avatar),
    evidence: [],
  });

describe("persona avatars", () => {
  it("ships every portrait as a small file with a unique id, credit and Unsplash link", () => {
    expect(new Set(PERSONA_AVATARS.map((a) => a.id)).size).toBe(PERSONA_AVATARS.length);
    for (const a of PERSONA_AVATARS) {
      const file = path.join(process.cwd(), "public", avatarSrc(a));
      expect(existsSync(file), a.id).toBe(true);
      expect(statSync(file).size).toBeLessThan(60_000);
      expect(a.credit.length).toBeGreaterThan(2);
      expect(a.source).toMatch(/^https:\/\/unsplash\.com\/photos\/[\w-]+$/);
      expect(a.alt.length).toBeGreaterThan(5);
    }
  });

  it("treats an empty or unknown id as initials", () => {
    expect(getAvatar("")).toBeNull();
    expect(getAvatar("../../etc/passwd")).toBeNull();
    expect(getAvatar("01")?.id).toBe("01");
    expect(normalizePersonaContent("profile", {}).avatar).toBe("");
  });

  it("adds a labelled cover image to the document only when one is chosen", () => {
    expect(build("").image).toBeUndefined();
    expect(build("zz").image).toBeUndefined();
    const image = build("02").image!;
    expect(image.src).toBe("/personas/avatars/02.jpg");
    expect(image.caption).toContain(AVATAR_LABEL);
    expect(image.caption).not.toMatch(/unsplash|photo:/i);
  });

  it("carries the picture and its label into Markdown, Word and PDF", async () => {
    const doc = build("12");
    const md = renderMarkdown(doc);
    expect(md).toMatch(/!\[[^\]]+\]\(https?:\/\/[^)]+\/personas\/avatars\/12\.jpg\)/);
    expect(md).toContain(AVATAR_LABEL);

    const withPic = await renderDocx(doc);
    const without = await renderDocx(build(""));
    const media = async (buf: Buffer) => Object.keys((await JSZip.loadAsync(buf)).files).filter((f) => f.startsWith("word/media/"));
    expect((await media(withPic)).length).toBe((await media(without)).length + 1);

    const pdfWith = await renderPdf(doc);
    const pdfWithout = await renderPdf(build(""));
    expect(pdfWith.length).toBeGreaterThan(pdfWithout.length + 5_000);
  });
});
