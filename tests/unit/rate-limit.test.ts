import { afterEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, MemoryRateLimitStore, setRateLimitStore, RATE_LIMITS } from "@/lib/rate-limit";

afterEach(() => {
  vi.useRealTimers();
  setRateLimitStore(new MemoryRateLimitStore());
});

describe("rate limiting", () => {
  it("allows up to the limit then blocks", async () => {
    setRateLimitStore(new MemoryRateLimitStore());
    const policy = { limit: 3, windowMs: 60_000 };
    const results = [];
    for (let i = 0; i < 5; i++) results.push(await checkRateLimit("k", policy));
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false, false]);
    expect(results[0].remaining).toBe(2);
    expect(results[4].remaining).toBe(0);
    expect(results[4].retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks keys independently", async () => {
    setRateLimitStore(new MemoryRateLimitStore());
    const policy = { limit: 1, windowMs: 60_000 };
    expect((await checkRateLimit("a", policy)).allowed).toBe(true);
    expect((await checkRateLimit("b", policy)).allowed).toBe(true);
    expect((await checkRateLimit("a", policy)).allowed).toBe(false);
  });

  it("resets after the window elapses", async () => {
    vi.useFakeTimers();
    setRateLimitStore(new MemoryRateLimitStore());
    const policy = { limit: 1, windowMs: 1000 };
    await checkRateLimit("k", policy);
    expect((await checkRateLimit("k", policy)).allowed).toBe(false);
    vi.advanceTimersByTime(1001);
    expect((await checkRateLimit("k", policy)).allowed).toBe(true);
  });

  it("supports swapping in a shared store for production", async () => {
    const calls: string[] = [];
    setRateLimitStore({
      async hit(key) {
        calls.push(key);
        return { count: 1, resetAt: Date.now() + 1000 };
      },
    });
    expect((await checkRateLimit("ai:user-1", RATE_LIMITS.ai)).allowed).toBe(true);
    expect(calls).toEqual(["ai:user-1"]);
  });
});
