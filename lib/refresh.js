// Core refresh job: for each widget, pull both sources from Apify
// INCREMENTALLY (only reviews newer than what we've already cached), merge the
// new ones into the cache, cap to the per-location limit, and store.
//
// Cost model: Apify bills per review scraped, on every fetch. So we use a
// `cutoff` (the timestamp of the newest review we already have per source) to
// fetch only genuinely-new reviews. First pull for a location scrapes up to
// `max` reviews; every refresh after that scrapes only the handful of new ones.

import { getAllWidgets } from "@/lib/widgets";
import { getGoogle, getFacebook } from "@/lib/apify";
import { assemblePayload } from "@/lib/normalize";
import { kvGet, kvSet } from "@/lib/store";

export const cacheKey = (id) => `reviews:${id}`;

// Max reviews stored & fetched per location. Per-widget override: widget.maxReviews.
const DEFAULT_MAX = Number(process.env.REVIEWS_LIMIT || 30);

// Newest cached review time (ms) for one source, or 0 if none cached yet.
function newestTime(reviews, source) {
  let t = 0;
  for (const r of reviews) {
    if (r.source === source && r.time > t) t = r.time;
  }
  return t;
}

export async function refreshWidget(widget) {
  const max = Number(widget.maxReviews || DEFAULT_MAX);

  const g = widget.sources?.google;
  const f = widget.sources?.facebook;
  const googleQuery = g?.place_id || g?.query || g?.url;
  const fbQuery = f?.page_url || f?.query || f?.url;

  const prev = await kvGet(cacheKey(widget.id));
  const prevReviews = (prev && prev.reviews) || [];

  // Incremental cutoff (ms epoch). Only set it once we already have reviews for
  // that source, so the very first pull fetches the full `max`.
  const gCutoff = newestTime(prevReviews, "google") || undefined;
  const fCutoff = newestTime(prevReviews, "facebook") || undefined;

  const result = { id: widget.id, google: false, facebook: false, error: null };
  let google = null;
  let facebook = null;

  try {
    if (googleQuery) {
      google = await getGoogle(googleQuery, { limit: max, cutoff: gCutoff });
      result.google = true;
    }
  } catch (e) {
    result.error = `google: ${e.message}`;
  }

  try {
    if (fbQuery) {
      facebook = await getFacebook(fbQuery, { limit: max, cutoff: fCutoff });
      result.facebook = true;
    }
  } catch (e) {
    result.error = [result.error, `facebook: ${e.message}`].filter(Boolean).join("; ");
  }

  // If BOTH sources failed, keep the previous cache untouched rather than
  // wiping a working widget.
  if (!google && !facebook) {
    result.skipped = true;
    return result;
  }

  const payload = assemblePayload(widget, prev, { google, facebook }, max);

  await kvSet(cacheKey(widget.id), payload);
  result.count = payload.reviews.length; // total stored (capped at max)
  return result;
}

export async function refreshAll() {
  const widgets = await getAllWidgets();
  const results = [];
  for (const w of widgets) {
    // Sequential to stay gentle on the provider + avoid function timeouts.
    results.push(await refreshWidget(w));
  }
  return results;
}
