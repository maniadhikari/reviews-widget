import { NextResponse } from "next/server";
import { getWidget } from "@/lib/widgets";
import { refreshWidget, refreshAll } from "@/lib/refresh";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// POST            -> refresh all widgets
// POST ?id=<id>   -> refresh a single widget
// This is what spends Outscraper credit, so it's admin-only (see middleware).
export async function POST(request) {
  if (!process.env.APIFY_TOKEN) {
    return NextResponse.json(
      { error: "APIFY_TOKEN is not set — add it to .env.local / Vercel env" },
      { status: 400 }
    );
  }

  const id = new URL(request.url).searchParams.get("id");
  try {
    if (id) {
      const w = await getWidget(id);
      if (!w) return NextResponse.json({ error: "unknown widget" }, { status: 404 });
      const result = await refreshWidget(w);
      return NextResponse.json({ ok: true, results: [result] });
    }
    const results = await refreshAll();
    return NextResponse.json({ ok: true, results });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
