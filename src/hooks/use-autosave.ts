"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";
export type SaveResult = { ok: true } | { ok: false; error: string };

/**
 * Debounced, serialised autosave.
 *
 * - `markDirty(key, value)` keeps only the latest value per key.
 * - Saves never overlap: batches run one after another, so a slow save can't
 *   be overtaken (and overwritten) by a later one.
 * - A failed batch is put back, so nothing is lost and `flush()` retries it.
 */
export function useAutosave<V>({
  save,
  delay = 1000,
}: {
  save: (entries: [string, V][]) => Promise<SaveResult>;
  delay?: number;
}) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const pending = useRef(new Map<string, V>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chain = useRef<Promise<boolean>>(Promise.resolve(true));
  const saveRef = useRef(save);

  useEffect(() => {
    saveRef.current = save;
  });

  const drain = useCallback(async (): Promise<boolean> => {
    while (pending.current.size > 0) {
      const batch = new Map(pending.current);
      pending.current.clear();
      setStatus("saving");

      let result: SaveResult;
      try {
        result = await saveRef.current([...batch]);
      } catch {
        result = { ok: false, error: "We couldn't save. Check your connection and try again." };
      }

      if (!result.ok) {
        // Restore anything that wasn't superseded while the request was in flight.
        for (const [key, value] of batch) if (!pending.current.has(key)) pending.current.set(key, value);
        setStatus("error");
        setError(result.error);
        return false;
      }
    }
    setStatus("saved");
    setError(null);
    setSavedAt(new Date());
    return true;
  }, []);

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    chain.current = chain.current.then(drain);
    return chain.current;
  }, [drain]);

  const markDirty = useCallback(
    (key: string, value: V) => {
      pending.current.set(key, value);
      setStatus((s) => (s === "saving" ? s : "dirty"));
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), delay);
    },
    [delay, flush],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const hasUnsaved = useCallback(() => pending.current.size > 0, []);

  return { status, error, savedAt, markDirty, flush, hasUnsaved };
}
