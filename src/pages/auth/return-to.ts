const AUTH_PAGES = ["/auth/", "/signin"];

/**
 * The in-app path to go back to after signing in, when it is safe to follow:
 * a same-origin path, and not one of the sign-in pages themselves.
 */
export function resolveReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/")) return "/";
  if (value.startsWith("//") || value.startsWith("/\\")) return "/";
  if (AUTH_PAGES.some((p) => value.startsWith(p))) return "/";
  return value;
}

/** Absolute URL of the email-link landing page, carrying where to go afterwards. */
export function callbackUrl(returnTo: string): string {
  const url = new URL("/auth/callback", window.location.origin);
  if (returnTo !== "/") url.searchParams.set("returnTo", returnTo);
  return url.toString();
}
