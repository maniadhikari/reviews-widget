import { NextResponse } from "next/server";
import { getAllWidgets, saveWidget } from "@/lib/widgets";
import { kvGet } from "@/lib/store";
import { cacheKey } from "@/lib/refresh";
import { usingRedis } from "@/lib/store";

export const dynamic = "force-dynamic";

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// GET -> all widgets, each with cache status (review count / last updated).
export async function GET() {
  const widgets = await getAllWidgets();
  const withStatus = await Promise.all(
    widgets.map(async (w) => {
      const cache = await kvGet(cacheKey(w.id));
      return {
        ...w,
        status: cache
          ? {
              count: cache.reviews?.length || 0,
              updatedAt: cache.updatedAt || null,
              overall: cache.summary?.overall || 0,
              google: cache.summary?.google || null,
              facebook: cache.summary?.facebook || null,
            }
          : null,
      };
    })
  );
  return NextResponse.json({ widgets: withStatus, persistent: usingRedis });
}

// POST -> create or update a widget config.
export async function POST(request) {
  const body = await request.json().catch(() => ({}));

  const id = slugify(body.id || body.name);
  if (!id) return NextResponse.json({ error: "id or name is required" }, { status: 400 });
  if (!body.name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const sources = {};
  if (body.google) sources.google = { place_id: String(body.google).trim() };
  if (body.facebook) sources.facebook = { page_url: String(body.facebook).trim() };
  if (!sources.google && !sources.facebook) {
    return NextResponse.json(
      { error: "provide a Google place_id/URL and/or a Facebook page URL" },
      { status: 400 }
    );
  }

  const widget = {
    id,
    name: String(body.name).trim(),
    sources,
    minRating: body.minRating ? Number(body.minRating) : 4,
  };
  if (body.maxReviews) widget.maxReviews = Number(body.maxReviews);

  await saveWidget(widget);
  return NextResponse.json({ ok: true, widget });
}
