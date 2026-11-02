"use client";

import * as React from "react";
import Image from "next/image";
import { Check } from "lucide-react";
import { AVATAR_LABEL, PERSONA_AVATARS, avatarSrc, getAvatar } from "@/lib/personas/avatars";
import { cn } from "@/lib/utils";

export const personaInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
};

/**
 * The persona's picture: the chosen illustrative portrait, or initials when none is chosen.
 * Pass `decorative` where the persona's name sits right beside it (lists, cards, tables), so
 * screen readers hear the name once instead of a photo description as well.
 */
export function PersonaAvatar({ avatarId, name, className, decorative }: { avatarId: string; name: string; className?: string; decorative?: boolean }) {
  const avatar = getAvatar(avatarId);
  if (avatar) {
    return (
      <Image
        src={avatarSrc(avatar)}
        alt={decorative ? "" : avatar.alt}
        width={128}
        height={128}
        className={cn("size-16 shrink-0 rounded-full border border-border bg-muted object-cover", className)}
      />
    );
  }
  return (
    <span aria-hidden className={cn("flex size-16 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xl font-bold text-primary-text", className)}>
      {personaInitials(name)}
    </span>
  );
}

const tile =
  "relative block size-14 cursor-pointer overflow-hidden rounded-full border border-border transition-[box-shadow,border-color] has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50 hover:border-border-strong";

/**
 * Choose an illustrative portrait, or keep initials. A native radio group, so arrow keys and Tab
 * behave the way people expect without extra handlers.
 */
export function AvatarPicker({ value, name, onChange }: { value: string; name: string; onChange: (id: string) => void }) {
  const group = React.useId();
  const chosen = getAvatar(value);
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold">
        Picture <span className="text-xs font-normal text-muted-foreground">Optional</span>
      </legend>
      <div className="flex flex-wrap gap-2.5">
        <label className={cn(tile, !chosen && "border-primary ring-2 ring-primary ring-offset-2 ring-offset-background")}>
          <input type="radio" name={group} className="sr-only" checked={!chosen} onChange={() => onChange("")} aria-label="Initials, no photo" />
          <span aria-hidden className="flex size-full items-center justify-center bg-primary-soft text-base font-bold text-primary-text">
            {personaInitials(name)}
          </span>
        </label>
        {PERSONA_AVATARS.map((a) => {
          const on = chosen?.id === a.id;
          return (
            <label key={a.id} className={cn(tile, on && "border-primary ring-2 ring-primary ring-offset-2 ring-offset-background")}>
              <input type="radio" name={group} className="sr-only" checked={on} onChange={() => onChange(a.id)} aria-label={a.alt} />
              <Image src={avatarSrc(a)} alt="" width={112} height={112} className="size-full object-cover" />
              {on && (
                <span aria-hidden className="absolute right-0.5 bottom-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-3" strokeWidth={3} />
                </span>
              )}
            </label>
          );
        })}
      </div>
      <p className="max-w-[62ch] text-xs text-muted-foreground">
        {AVATAR_LABEL} It is labelled that way on the persona and in every export, so nobody mistakes it for a participant. Initials are the default.
      </p>
    </fieldset>
  );
}
