"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

const SCHEMES = ["https://", "http://"] as const;
type Scheme = (typeof SCHEMES)[number];

const splitUrl = (value: string): { scheme?: Scheme; rest: string } => {
  const match = /^(https?:\/\/)(.*)$/i.exec(value);
  return match ? { scheme: match[1].toLowerCase() as Scheme, rest: match[2] } : { rest: value };
};

export const isValidUrl = (value: string) => value === "" || /^https?:\/\/\S+$/i.test(value);

/**
 * A web address with the protocol chosen from a menu, so people only type the rest ("acme.com").
 * The value stays a full URL ("" while nothing is typed), so schemas and saved data are unchanged.
 * Pasting a full link switches the menu and drops the duplicate prefix.
 */
export function UrlField({
  label,
  value,
  onChange,
  optional,
  error,
  placeholder = "example.com",
  id: idProp,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
  error?: string;
  placeholder?: string;
  id?: string;
}) {
  const generated = React.useId();
  const id = idProp ?? generated;
  const parsed = splitUrl(value);
  const [scheme, setScheme] = React.useState<Scheme>(parsed.scheme ?? "https://");
  const active = parsed.scheme ?? scheme;

  const emit = (nextScheme: Scheme, rest: string) => {
    const split = splitUrl(rest.trim());
    const finalScheme = split.scheme ?? nextScheme;
    setScheme(finalScheme);
    onChange(split.rest === "" ? "" : `${finalScheme}${split.rest}`);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {optional && <span className="text-xs text-muted-foreground">Optional</span>}
      </div>
      <div className="flex gap-2">
        <div className="w-28 shrink-0">
          <NativeSelect aria-label="Link prefix" value={active} onChange={(e) => emit(e.target.value as Scheme, parsed.rest)}>
            {SCHEMES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </NativeSelect>
        </div>
        <Input
          id={id}
          inputMode="url"
          autoComplete="url"
          placeholder={placeholder}
          value={parsed.rest}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn("min-w-0 flex-1")}
          onChange={(e) => emit(active, e.target.value)}
        />
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-destructive">{error}</p>
      )}
    </div>
  );
}
