/**
 * Rate-limiting architecture.
 *
 * `checkRateLimit` talks to a `RateLimitStore`. The default store is
 * in-memory, which is per server instance and therefore only a best-effort
 * guard on serverless platforms. Before shipping AI endpoints, implement
 * `RateLimitStore` on a shared store (e.g. Upstash Redis or a Supabase table)
 * and pass it to `setRateLimitStore()`; call sites do not change.
 */

export interface RateLimitPolicy {
  /** Maximum hits allowed per window. */
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export interface RateLimitStore {
  /** Records a hit and returns the hit count and window reset time (ms epoch). */
  hit(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
}

export const RATE_LIMITS = {
  authAttempt: { limit: 10, windowMs: 60_000 },
  passwordReset: { limit: 5, windowMs: 15 * 60_000 },
  /** Reserved for future AI endpoints. */
  ai: { limit: 20, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitPolicy>;

export class MemoryRateLimitStore implements RateLimitStore {
  private readonly entries = new Map<string, { count: number; resetAt: number }>();

  async hit(key: string, windowMs: number) {
    const now = Date.now();
    this.sweep(now);
    const existing = this.entries.get(key);
    if (!existing || existing.resetAt <= now) {
      const fresh = { count: 1, resetAt: now + windowMs };
      this.entries.set(key, fresh);
      return fresh;
    }
    existing.count += 1;
    return existing;
  }

  private sweep(now: number) {
    if (this.entries.size < 1000) return;
    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now) this.entries.delete(key);
    }
  }
}

let store: RateLimitStore = new MemoryRateLimitStore();

export function setRateLimitStore(next: RateLimitStore) {
  store = next;
}

export async function checkRateLimit(
  key: string,
  policy: RateLimitPolicy,
): Promise<RateLimitResult> {
  const { count, resetAt } = await store.hit(key, policy.windowMs);
  return {
    allowed: count <= policy.limit,
    remaining: Math.max(0, policy.limit - count),
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)),
  };
}
