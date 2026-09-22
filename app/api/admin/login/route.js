import { NextResponse } from "next/server";
import { COOKIE, expectedToken, authDisabled } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST { password } -> set auth cookie. DELETE -> log out.
export async function POST(request) {
  const { password } = await request.json().catch(() => ({}));

  if (!authDisabled() && password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "wrong password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await expectedToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
