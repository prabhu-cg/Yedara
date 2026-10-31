/** Route classification shared by the proxy, auth redirects and tests. */

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/projects",
  "/tools",
  "/templates",
  "/settings",
  "/billing",
];

const AUTH_ROUTES = ["/login", "/signup", "/forgot-password"];

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isProtectedRoute(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

export function isAuthRoute(pathname: string) {
  return AUTH_ROUTES.some((route) => matchesPrefix(pathname, route));
}

/**
 * Only allows same-origin relative paths as post-login redirect targets, to
 * prevent open redirects via `?next=`.
 */
export function safeRedirectPath(
  value: string | null | undefined,
  fallback = "/dashboard",
) {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }
  // Reject control characters and anything that would parse as an absolute URL.
  if (/[\u0000-\u001f]/.test(value)) return fallback;
  return value;
}
