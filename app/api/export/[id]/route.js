import { NextResponse } from "next/server";
import { kvGet } from "@/lib/store";
import { getWidget } from "@/lib/widgets";
import { refreshWidget, cacheKey } from "@/lib/refresh";
import { reviewsToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// GET /api/export/<id>            -> CSV of all reviews for a widget
// GET /api/export/<id>?source=google | facebook   -> filtered
// Ready to download and drop into Webflow CMS import.
export async function GET(request, { params }) {
  const { id } = await params;
  const source = new URL(request.url).searchParams.get("source");

  let data = await kvGet(cacheKey(id));

  if (!data) {
    const widget = await getWidget(id);
    if (!widget) {
      return NextResponse.json({ error: "unknown widget" }, { status: 404 });
    }
    if (process.env.APIFY_TOKEN) {
      try {
        await refreshWidget(widget);
        data = await kvGet(cacheKey(id));
      } catch {
        /* ignore */
      }
    }
  }

  let reviews = (data && data.reviews) || [];
  if (source === "google" || source === "facebook") {
    reviews = reviews.filter((r) => r.source === source);
  }

  const csv = reviewsToCsv(reviews);
  const fname = `${id}${source ? "-" + source : ""}-reviews.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fname}"`,
      "Cache-Control": "no-store",
    },
  });
}
