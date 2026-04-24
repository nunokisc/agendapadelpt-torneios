/**
 * Reads the admin token for a tournament from cookies.
 * Used client-side to retrieve the token stored by middleware.
 */
export function getAdminToken(slug: string): string {
  if (typeof document === "undefined") return "";
  const name = `admin_token_${slug}=`;
  const decoded = decodeURIComponent(document.cookie);
  const parts = decoded.split("; ");
  for (const part of parts) {
    if (part.startsWith(name)) return part.substring(name.length);
  }
  return "";
}
