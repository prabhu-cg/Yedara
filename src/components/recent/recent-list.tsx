"use client";

import * as React from "react";
import Link from "next/link";
import { PersonaAvatar } from "@/components/personas/persona-avatar";
import { WORK_KINDS } from "@/config/work-kinds";
import { formatRelativeTime } from "@/lib/format";
import type { RecentItem } from "@/lib/recent";
import { groupRecent } from "@/lib/recent-groups";

const subscribe = () => () => {};
const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * Recent work under day headings, like a file manager. Days are the reader's own: the server
 * renders in UTC, then the browser's time zone takes over, so "Today" is never someone else's today.
 */
export function RecentList({ items, now }: { items: RecentItem[]; now: string }) {
  const timeZone = React.useSyncExternalStore(subscribe, browserZone, () => "UTC");
  const groups = React.useMemo(() => groupRecent(items, now, timeZone), [items, now, timeZone]);

  return (
    <div className="overflow-x-auto rounded-card border border-border bg-card shadow-card">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">Recent work, newest first</caption>
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th scope="col" className="px-4 py-2.5 font-semibold">Name</th>
            <th scope="col" className="hidden px-3 py-2.5 font-semibold sm:table-cell">Type</th>
            <th scope="col" className="hidden px-3 py-2.5 font-semibold md:table-cell">Project</th>
            <th scope="col" className="px-4 py-2.5 text-right font-semibold">Last edited</th>
          </tr>
        </thead>
        {groups.map((group) => (
          <tbody key={group.key} className="border-b border-border last:border-b-0">
            <tr>
              <th scope="colgroup" colSpan={4} className="bg-secondary/60 px-4 py-2 text-xs font-semibold text-muted-foreground">
                {group.label}
              </th>
            </tr>
            {group.items.map((item) => {
              const { icon: Icon, label } = WORK_KINDS[item.kind];
              return (
                <tr key={`${item.kind}-${item.id}`} data-kind={item.kind} className="border-t border-border align-middle first:border-t-0 hover:bg-secondary/60">
                  <th scope="row" className="max-w-0 min-w-40 px-4 py-3 font-semibold">
                    <Link href={item.href} className="flex items-center gap-3 rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
                      {item.kind === "persona" ? (
                        <PersonaAvatar avatarId={item.avatar ?? ""} name={item.title} decorative className="size-7 text-[11px]" />
                      ) : (
                        <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="min-w-0">
                        <span className="block truncate hover:text-primary-text">{item.title}</span>
                        <span className="block truncate text-xs font-normal text-muted-foreground sm:hidden">
                          {label}
                          {item.project ? ` · ${item.project}` : ""}
                        </span>
                      </span>
                    </Link>
                  </th>
                  <td className="hidden px-3 py-3 whitespace-nowrap text-muted-foreground sm:table-cell">{label}</td>
                  <td className="hidden max-w-56 truncate px-3 py-3 text-muted-foreground md:table-cell">{item.project ?? "—"}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap text-muted-foreground" title={new Date(item.updatedAt).toLocaleString()}>
                    {formatRelativeTime(item.updatedAt, new Date(now).getTime())}
                  </td>
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}
