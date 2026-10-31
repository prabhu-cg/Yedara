import "server-only";
import { isIP } from "node:net";

/**
 * Website research adapter: the seam for FUTURE automated competitor research.
 *
 * Phase 3 ships it disabled. Manual research is complete without it, and nothing here fetches a
 * page. When a real adapter is added it must follow these rules, which the types encode:
 *
 *  - Only permitted sources: respect robots.txt (`isAllowedByRobots`) and the site's terms,
 *    and refuse private or internal addresses (`validateResearchUrl`).
 *  - Every finding names its source URL and retrieval date.
 *  - Verified facts (text actually found on the page) and AI interpretation are different types
 *    and are never mixed. An interpretation can't be stored as a fact.
 *  - Never invent pricing or features: if the page doesn't say it, the finding doesn't exist.
 */

export type ResearchRequest = {
  url: string;
  /** What to look for, e.g. "pricing". Used to scope the fetch, not to guess answers. */
  topic: "pricing" | "features" | "positioning" | "general";
};

export type VerifiedFact = {
  kind: "verified";
  field: string;
  value: string;
  /** The exact text on the page that supports the value. */
  evidence: string;
  sourceUrl: string;
  retrievedAt: string;
};

export type Interpretation = {
  kind: "interpretation";
  text: string;
  origin: "ai";
  /** Always shown as machine-written and never promoted to a fact automatically. */
  label: "AI interpretation, not verified";
  sourceUrl: string;
  retrievedAt: string;
};

export type ResearchResult =
  | { ok: true; facts: VerifiedFact[]; interpretations: Interpretation[] }
  | { ok: false; reason: "disabled" | "blocked_by_robots" | "invalid_url" | "failed"; message: string };

export interface WebsiteResearchAdapter {
  readonly enabled: boolean;
  research(request: ResearchRequest): Promise<ResearchResult>;
}

export const disabledResearchAdapter: WebsiteResearchAdapter = {
  enabled: false,
  async research() {
    return { ok: false, reason: "disabled", message: "Automated website research isn't available. Add sources manually." };
  },
};

let adapter: WebsiteResearchAdapter = disabledResearchAdapter;
export const getResearchAdapter = () => adapter;
export const setResearchAdapter = (next: WebsiteResearchAdapter) => {
  adapter = next;
};

/* ------------------------------------------------------------------ */
/* Guards a real adapter must use                                      */
/* ------------------------------------------------------------------ */

const PRIVATE_V4 = [/^10\./, /^127\./, /^169\.254\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^0\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./];

function isPrivateHost(hostname: string) {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return true;
  const version = isIP(host);
  if (version === 4) return PRIVATE_V4.some((re) => re.test(host));
  if (version === 6) return host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80") || host.startsWith("::ffff:");
  // Not an IP literal: require a dotted public-looking name.
  return !host.includes(".");
}

export type UrlCheck = { ok: true; url: URL } | { ok: false; message: string };

/** SSRF guard: https/http only, no credentials, no private or internal hosts, sane port. */
export function validateResearchUrl(raw: string): UrlCheck {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, message: "That doesn't look like a valid web address." };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return { ok: false, message: "Only http and https links can be researched." };
  if (url.username || url.password) return { ok: false, message: "Links with embedded credentials are not allowed." };
  if (isPrivateHost(url.hostname)) return { ok: false, message: "That address is private or internal and can't be researched." };
  if (url.port && !["80", "443"].includes(url.port)) return { ok: false, message: "Only standard web ports are allowed." };
  return { ok: true, url };
}

/**
 * Minimal robots.txt evaluation (RFC 9309 style: longest matching rule wins, Allow beats Disallow
 * on ties). Returns true when `path` may be fetched by `userAgent`.
 */
export function isAllowedByRobots(robotsTxt: string, userAgent: string, path: string): boolean {
  const agent = userAgent.toLowerCase();
  type Group = { agents: string[]; rules: { allow: boolean; pattern: string }[] };
  const groups: Group[] = [];
  let current: Group | null = null;
  let lastWasAgent = false;

  for (const rawLine of robotsTxt.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (field === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if ((field === "allow" || field === "disallow") && current) {
      current.rules.push({ allow: field === "allow", pattern: value });
      lastWasAgent = false;
    } else {
      lastWasAgent = false;
    }
  }

  const specific = groups.filter((g) => g.agents.some((a) => a !== "*" && agent.includes(a)));
  const applicable = specific.length ? specific : groups.filter((g) => g.agents.includes("*"));
  const rules = applicable.flatMap((g) => g.rules).filter((r) => r.pattern !== "");
  if (!rules.length) return true;

  const matches = (pattern: string) => {
    const anchored = pattern.endsWith("$");
    const body = (anchored ? pattern.slice(0, -1) : pattern).replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    return new RegExp(`^${body}${anchored ? "$" : ""}`).test(path);
  };
  let best: { allow: boolean; length: number } | null = null;
  for (const rule of rules) {
    if (!matches(rule.pattern)) continue;
    const length = rule.pattern.length;
    if (!best || length > best.length || (length === best.length && rule.allow)) best = { allow: rule.allow, length };
  }
  return best ? best.allow : true;
}
