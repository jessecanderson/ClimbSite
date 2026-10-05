export function safeLocalPath(value: unknown, fallback = "/trips") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) return fallback;
  try {
    const url = new URL(value, "https://climbsite.local");
    if (url.origin !== "https://climbsite.local") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function loginPath(returnTo: string) {
  return `/login?callbackUrl=${encodeURIComponent(safeLocalPath(returnTo))}`;
}
