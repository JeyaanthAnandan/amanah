import { NextResponse, type NextRequest } from "next/server";

/**
 * Coarse auth gate (edge). Fine-grained role checks happen in each route
 * handler / page via requireUser() / pageCtx() because they need the DB.
 */
const PUBLIC_API = ["/api/session", "/api/lang", "/api/lab/public-key", "/api/wallet/", "/api/demo/reset"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/")) {
    if (PUBLIC_API.some((p) => pathname.startsWith(p))) return NextResponse.next();
    if (!req.cookies.get("amanah_persona")) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });
  }
  return NextResponse.next();
}

export const config = { matcher: ["/api/:path*"] };
