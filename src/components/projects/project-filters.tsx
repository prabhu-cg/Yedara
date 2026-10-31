"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { DEFAULT_STATUS_FILTER, PROJECT_STATUSES, STATUS_LABELS } from "@/lib/projects/constants";

export function ProjectFilters({ q, status }: { q: string; status: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [term, setTerm] = useState(q);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync the input with *external* URL changes (back/forward, "Clear filters").
  // Echoes of our own pushes are ignored so a late response can't overwrite typing.
  const [seenQ, setSeenQ] = useState(q);
  const [pushedQ, setPushedQ] = useState(q);
  if (q !== seenQ) {
    setSeenQ(q);
    if (q !== pushedQ) {
      setTerm(q);
      setPushedQ(q);
    }
  }
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  function update(next: { q?: string; status?: string }) {
    // Read the live URL: a debounced call must not overwrite newer filter changes.
    const params = new URLSearchParams(window.location.search);
    const apply = (key: string, value: string | undefined, fallback = "") => {
      if (value === undefined) return;
      if (value === fallback) params.delete(key);
      else params.set(key, value);
    };
    if (next.q !== undefined) setPushedQ(next.q.trim());
    apply("q", next.q?.trim());
    apply("status", next.status, DEFAULT_STATUS_FILTER);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  function onSearchChange(value: string) {
    setTerm(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => update({ q: value }), 300);
  }

  return (
    <div role="search" className="mb-6 flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          value={term}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name, client or description"
          aria-label="Search projects"
          className="pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
          maxLength={80}
        />
        {term && (
          <button
            type="button"
            onClick={() => {
              setTerm("");
              update({ q: "" });
            }}
            aria-label="Clear search"
            className="absolute top-1/2 right-1.5 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      <div className="sm:w-52">
        <NativeSelect
          aria-label="Filter by status"
          value={status}
          onChange={(e) => update({ status: e.target.value })}
        >
          <option value="active">Active projects</option>
          <option value="all">All projects</option>
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </NativeSelect>
      </div>
    </div>
  );
}
