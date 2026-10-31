"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navGroups, isActive } from "@/config/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const itemClasses =
  "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex flex-col gap-6">
      {navGroups.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {group.label}
          </p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = isActive(item, pathname);
              const Icon = item.icon;
              const content = (
                <>
                  <Icon aria-hidden className="size-4 shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <Badge variant="outline" className="bg-background px-2 py-0 text-[11px] font-medium">
                      {item.badge}
                    </Badge>
                  )}
                </>
              );

              return (
                <li key={item.href}>
                  {item.disabled ? (
                    <span
                      aria-disabled="true"
                      title={`${item.label} is not available yet`}
                      className={cn(itemClasses, "cursor-not-allowed text-muted-foreground opacity-80")}
                    >
                      {content}
                    </span>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        itemClasses,
                        active
                          ? "bg-primary-soft text-primary"
                          : "text-foreground hover:bg-accent",
                      )}
                    >
                      {content}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
