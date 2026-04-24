import { NextRequest, NextResponse } from "next/server";

const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const rateMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMITS: Record<string, number> = {
  "POST:/api/tournament": 5,           // 5 tournament creations per minute
  "POST:/api/tournament/register": 10, // 10 registrations per minute
  default: 60,                          // 60 requests per minute for other mutations
};

function getRateKey(method: string, pathname: string): string {
  if (method === "POST" && pathname === "/api/tournament") return "POST:/api/tournament";
  if (method === "POST" && pathname.endsWith("/register")) return "POST:/api/tournament/register";
  return "default";
}

function checkRateLimit(ip: string, rateKey: string): boolean {
  const limit = RATE_LIMITS[rateKey] ?? RATE_LIMITS.default;
  const key = `${ip}:${rateKey}`;
  const now = Date.now();
  const entry = rateMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  entry.count++;
  return entry.count <= limit;
}

// Periodically clean up expired entries
setInterval(() => {
  const now = Date.now();
  const keys = Array.from(rateMap.keys());
  for (const key of keys) {
    const entry = rateMap.get(key);
    if (entry && now > entry.resetAt) rateMap.delete(key);
  }
}, 60_000);

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // ── Rate limiting for mutation API routes ──
  if (pathname.startsWith("/api/") && req.method !== "GET") {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rateKey = getRateKey(req.method, pathname);
    if (!checkRateLimit(ip, rateKey)) {
      return NextResponse.json(
        { error: "Demasiados pedidos. Tenta novamente em breve." },
        { status: 429 }
      );
    }
  }

  // ── Admin token: URL param → cookie → clean redirect ──
  if (pathname.startsWith("/tournament/")) {
    const tokenParam = searchParams.get("token");

    if (tokenParam) {
      // Extract slug from /tournament/[slug]...
      const parts = pathname.split("/");
      const slug = parts[2];
      if (slug) {
        // Store token in httpOnly cookie scoped to this tournament
        const cleanUrl = req.nextUrl.clone();
        cleanUrl.searchParams.delete("token");
        const response = NextResponse.redirect(cleanUrl);
        response.cookies.set(`admin_token_${slug}`, tokenParam, {
          httpOnly: true,
          sameSite: "lax",
          path: `/`,
          maxAge: 60 * 60 * 24 * 90, // 90 days
        });
        return response;
      }
    }
  }

  // ── Pass admin token from cookie to API calls ──
  // API routes read from query param or X-Admin-Token header
  // Client-side code will read from cookie via a helper

  return NextResponse.next();
}

export const config = {
  matcher: ["/tournament/:path*", "/api/:path*"],
};
