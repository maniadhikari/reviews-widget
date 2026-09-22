import { NextResponse } from "next/server";
import { refreshAll } from "@/lib/refresh";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // seconds (Vercel Pro). Lower on Hobby.

// Triggered daily by Vercel Cron (see vercel.json). Vercel automatically sends
// `Authorization: Bearer $CRON_SECRET`. We reject anything else so the endpoint
// can't be spammed. You can also hit it manually with the same header to force
// a refresh.
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const results = await refreshAll();
    return NextResponse.json({ ok: true, refreshed: results.length, results });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
