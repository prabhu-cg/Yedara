import { describe, expect, it } from "vitest";
import { isAuthRoute, isProtectedRoute, safeRedirectPath } from "@/lib/routes";

describe("protected route classification", () => {
  it.each([
    "/dashboard",
    "/projects",
    "/projects/new",
    "/projects/abc/edit",
    "/tools",
    "/tools/journey-mapper",
    "/templates",
    "/settings",
    "/settings/account",
    "/billing",
  ])("%s requires a session", (path) => {
    expect(isProtectedRoute(path)).toBe(true);
  });

  it.each(["/", "/login", "/signup", "/forgot-password", "/reset-password", "/auth/callback", "/projectsx", "/dashboards"])(
    "%s is public",
    (path) => {
      expect(isProtectedRoute(path)).toBe(false);
    },
  );

  it("identifies the auth pages that signed-in users are redirected away from", () => {
    expect(isAuthRoute("/login")).toBe(true);
    expect(isAuthRoute("/signup")).toBe(true);
    expect(isAuthRoute("/forgot-password")).toBe(true);
    expect(isAuthRoute("/reset-password")).toBe(false);
    expect(isAuthRoute("/dashboard")).toBe(false);
  });
});

describe("safeRedirectPath", () => {
  it("allows same-origin relative paths", () => {
    expect(safeRedirectPath("/projects/new")).toBe("/projects/new");
    expect(safeRedirectPath("/projects?status=review&q=a")).toBe("/projects?status=review&q=a");
  });

  it.each([
    "https://evil.example.com",
    "//evil.example.com",
    "/\\evil.example.com",
    "javascript:alert(1)",
    "evil.example.com",
    "/ok\nSet-Cookie: x=1",
  ])("rejects %j", (value) => {
    expect(safeRedirectPath(value)).toBe("/dashboard");
  });

  it("falls back for empty values and honours a custom fallback", () => {
    expect(safeRedirectPath(null)).toBe("/dashboard");
    expect(safeRedirectPath("", "/home")).toBe("/home");
  });
});
