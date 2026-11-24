export function apiUrl(path: string): string {
  const base = (import.meta.env.VITE_API_BASE || "/api").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
