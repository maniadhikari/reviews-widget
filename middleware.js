import { NextResponse } from "next/server";
import { COOKIE, isValidCookie, authDisabled } from "@/lib/auth";

// Protect the admin UI + admin API. Public routes (embed.js, /api/reviews,
// /api/export, /api/cron) are intentionally left open.
export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Always allow the login page + login endpoint through.
  if (pathname === "/admin/login" || pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  if (authDisabled()) return NextResponse.next();

  const cookie = request.cookies.get(COOKIE)?.value;
  if (await isValidCookie(cookie)) return NextResponse.next();

  // API → 401 JSON; pages → redirect to login.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  return NextResponse.redirect(url);
}
