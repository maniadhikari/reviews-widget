import { NextResponse } from "next/server";
import { kvGet } from "@/lib/store";
import { getWidget } from "@/lib/widgets";
import { refreshWidget, cacheKey } from "@/lib/refresh";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  // Let browsers/CDN serve the cached JSON for 5 min; refresh happens via cron.
  "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(_request, { params }) {
  const { id } = await params;

  let data = await kvGet(cacheKey(id));

  // Cold cache (never refreshed yet): fill on demand so the first load isn't
  // blank. After this it's served from cache until the next cron run.
  if (!data) {
    const widget = await getWidget(id);
    if (!widget) {
      return NextResponse.json({ error: "unknown widget" }, { status: 404, headers: CORS });
    }
    if (process.env.APIFY_TOKEN) {
      try {
        await refreshWidget(widget);
        data = await kvGet(cacheKey(id));
      } catch {
        /* fall through to empty */
      }
    }
  }

  if (!data) {
    return NextResponse.json(
      { id, reviews: [], summary: null, note: "no data yet" },
      { headers: CORS }
    );
  }

  return NextResponse.json(data, { headers: CORS });
}
