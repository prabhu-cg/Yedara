// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAutosave, type SaveResult } from "@/hooks/use-autosave";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup(impl: (entries: [string, string][]) => Promise<SaveResult>) {
  const save = vi.fn(impl);
  const hook = renderHook(() => useAutosave<string>({ save, delay: 1000 }));
  return { save, ...hook };
}

describe("useAutosave", () => {
  it("starts idle with nothing unsaved", () => {
    const { result } = setup(async () => ({ ok: true }));
    expect(result.current.status).toBe("idle");
    expect(result.current.hasUnsaved()).toBe(false);
  });

  it("debounces rapid edits into a single save of the latest value per key", async () => {
    const { result, save } = setup(async () => ({ ok: true }));
    act(() => {
      result.current.markDirty("goals", "a");
      result.current.markDirty("goals", "ab");
      result.current.markDirty("context", "x");
      result.current.markDirty("goals", "abc");
    });
    expect(result.current.status).toBe("dirty");
    expect(save).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith([
      ["goals", "abc"],
      ["context", "x"],
    ]);
    expect(result.current.status).toBe("saved");
    expect(result.current.savedAt).toBeInstanceOf(Date);
    expect(result.current.hasUnsaved()).toBe(false);
  });

  it("restarts the debounce window on each edit", async () => {
    const { result, save } = setup(async () => ({ ok: true }));
    act(() => result.current.markDirty("a", "1"));
    await act(async () => void (await vi.advanceTimersByTimeAsync(800)));
    act(() => result.current.markDirty("a", "2"));
    await act(async () => void (await vi.advanceTimersByTimeAsync(800)));
    expect(save).not.toHaveBeenCalled();
    await act(async () => void (await vi.advanceTimersByTimeAsync(300)));
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("flush saves immediately", async () => {
    const { result, save } = setup(async () => ({ ok: true }));
    act(() => result.current.markDirty("a", "1"));
    let ok = false;
    await act(async () => {
      ok = await result.current.flush();
    });
    expect(ok).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
    // The pending timer must not save a second time.
    await act(async () => void (await vi.advanceTimersByTimeAsync(2000)));
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("never runs two saves at once and keeps edits made while saving", async () => {
    let release!: () => void;
    let running = 0;
    let maxRunning = 0;
    const calls: [string, string][][] = [];
    const { result } = setup(async (entries) => {
      calls.push(entries);
      running++;
      maxRunning = Math.max(maxRunning, running);
      if (calls.length === 1) await new Promise<void>((r) => (release = r));
      running--;
      return { ok: true };
    });

    act(() => result.current.markDirty("a", "first"));
    let first!: Promise<boolean>;
    await act(async () => {
      first = result.current.flush();
      await Promise.resolve();
    });
    expect(result.current.status).toBe("saving");

    // Edit while the first request is in flight.
    act(() => result.current.markDirty("a", "second"));
    expect(result.current.status).toBe("saving");

    await act(async () => {
      release();
      await first;
    });
    expect(maxRunning).toBe(1);
    expect(calls).toEqual([[["a", "first"]], [["a", "second"]]]);
    expect(result.current.status).toBe("saved");
  });

  it("keeps failed edits, reports the error, and retries on flush", async () => {
    let fail = true;
    const { result, save } = setup(async () => (fail ? { ok: false, error: "Server said no" } : { ok: true }));
    act(() => result.current.markDirty("a", "keep me"));
    await act(async () => void (await vi.advanceTimersByTimeAsync(1000)));
    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("Server said no");
    expect(result.current.hasUnsaved()).toBe(true);

    fail = false;
    let ok = false;
    await act(async () => {
      ok = await result.current.flush();
    });
    expect(ok).toBe(true);
    expect(save).toHaveBeenLastCalledWith([["a", "keep me"]]);
    expect(result.current.status).toBe("saved");
    expect(result.current.error).toBeNull();
  });

  it("does not resurrect a failed value that was edited again", async () => {
    let fail = true;
    const { result, save } = setup(async () => (fail ? { ok: false, error: "x" } : { ok: true }));
    act(() => result.current.markDirty("a", "old"));
    await act(async () => void (await vi.advanceTimersByTimeAsync(1000)));
    act(() => result.current.markDirty("a", "new"));
    fail = false;
    await act(async () => void (await result.current.flush()));
    expect(save).toHaveBeenLastCalledWith([["a", "new"]]);
  });

  it("treats a thrown error as a failed save", async () => {
    const { result } = setup(async () => {
      throw new Error("network down");
    });
    act(() => result.current.markDirty("a", "1"));
    await act(async () => void (await result.current.flush()));
    expect(result.current.status).toBe("error");
    expect(result.current.error).toMatch(/couldn't save/i);
    expect(result.current.hasUnsaved()).toBe(true);
  });
});
