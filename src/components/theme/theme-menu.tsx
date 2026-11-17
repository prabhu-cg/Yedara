"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

/** The app has exactly two themes. There is no "system" option: light is the default. */
export type Theme = "light" | "dark";
export const THEME_KEY = "yedara-theme";

const listeners = new Set<() => void>();

function readTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  }
}

function setTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage can be unavailable (private mode); the choice still applies for this page view.
  }
  document.documentElement.classList.toggle("dark", theme === "dark");
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => void listeners.delete(onChange);
}

/**
 * A sun/moon pill that flips between light and dark. Both icons are rendered and swapped by the
 * `.dark` class, so the icon is right on first paint, before hydration.
 */
export function ThemeMenu({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "light" as Theme);
  const dark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Dark theme"
      aria-pressed={dark}
      title={dark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className={className}
    >
      <Sun aria-hidden className="hidden dark:block" />
      <Moon aria-hidden className="dark:hidden" />
    </Button>
  );
}

/** Runs before first paint to apply the saved theme, so there is no flash of the wrong one. Default is light. */
export const themeInitScript = `(function(){try{if(localStorage.getItem('${THEME_KEY}')==='dark')document.documentElement.classList.add('dark')}catch(e){}})()`;
