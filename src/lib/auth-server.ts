import { NextRequest } from "next/server";

/**
 * Extract admin token from request query param or cookie.
 * Priority: query param > cookie
 */
export function extractAdminToken(req: NextRequest, slug: string): string | null {
  const fromQuery = req.nextUrl.searchParams.get("token");
  if (fromQuery) return fromQuery;

  const fromCookie = req.cookies.get(`admin_token_${slug}`)?.value;
  return fromCookie ?? null;
}
