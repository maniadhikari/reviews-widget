// Apify provider — pulls Google Maps + Facebook reviews via Apify actors.
//
// Docs:
//   Google:   https://apify.com/compass/google-maps-reviews-scraper
//   Facebook: https://apify.com/apify/facebook-reviews-scraper
//
// Both are called synchronously via `run-sync-get-dataset-items`, which starts
// the actor and returns the dataset (an array of review items) in one request.
// Incremental refreshes use each actor's date filter so we only fetch (and pay
// for) reviews newer than what's already cached.

import { makeReview } from "@/lib/normalize";

const GOOGLE_ACTOR = "compass~google-maps-reviews-scraper";
const FACEBOOK_ACTOR = "apify~facebook-reviews-scraper";

function token() {
  const t = process.env.APIFY_TOKEN;
  if (!t) throw new Error("APIFY_TOKEN is not set");
  return t;
}

async function runActor(actorId, input) {
  const url = `https://api.apify.com/v2/actors/${actorId}/run-sync-get-dataset-items?token=${token()}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Apify ${actorId} ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// cutoff (ms epoch) -> "YYYY-MM-DD" for the actors' date filters.
function toDateStr(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

function looksLikePlaceId(q) {
  return /^ChIJ/i.test(q) || (!q.includes("http") && /^[A-Za-z0-9_-]{15,}$/.test(q));
}

// --- Google Maps reviews ------------------------------------------------
export async function getGoogle(query, { limit = 30, cutoff } = {}) {
  const input = { maxReviews: limit, reviewsSort: "newest", language: "en" };
  if (query.startsWith("http")) input.startUrls = [{ url: query }];
  else if (looksLikePlaceId(query)) input.placeIds = [query];
  else input.startUrls = [{ url: `https://www.google.com/maps/search/${encodeURIComponent(query)}` }];
  if (cutoff) input.reviewsStartDate = toDateStr(cutoff);

  const items = await runActor(GOOGLE_ACTOR, input);

  const reviews = items
    .filter((it) => it && (it.text || it.stars))
    .map((it) =>
      makeReview({
        source: "google",
        author: it.name,
        avatar: it.reviewerPhotoUrl,
        rating: it.stars,
        text: it.text,
        time: it.publishedAtDate,
        url: it.reviewUrl,
      })
    );

  // These actors stamp place-level aggregates on each review item, so we get a
  // true rating/count even on an incremental (few-review) pull.
  const first = items[0] || {};
  const rating = Number(first.totalScore ?? first.rating ?? 0) || 0;
  const total = Number(first.reviewsCount ?? first.totalReviews ?? 0) || reviews.length;
  return { reviews, rating, total };
}

// The actor expects the reviews tab URL (facebook.com/<page>/reviews). Accept
// either a plain page URL or a full reviews URL and normalize to the former.
function fbReviewsUrl(u) {
  let url = String(u || "").trim().replace(/\/+$/, "");
  if (/\/reviews$/i.test(url)) return url; // already a reviews URL
  if (url.includes("?")) return url; // e.g. profile.php?id=… — leave as-is
  return url + "/reviews";
}

// --- Facebook reviews / recommendations ---------------------------------
export async function getFacebook(query, { limit = 30, cutoff } = {}) {
  const input = { startUrls: [{ url: fbReviewsUrl(query) }], resultsLimit: limit };
  if (cutoff) input.onlyReviewsNewerThan = toDateStr(cutoff);

  const items = await runActor(FACEBOOK_ACTOR, input);

  const reviews = items
    .filter((it) => it && it.text)
    .map((it) =>
      makeReview({
        source: "facebook",
        author: it.user?.name || it.userName || it.name,
        avatar: it.user?.profilePic || it.profilePic,
        recommended: it.isRecommended, // no stars on FB -> mapped to 5/1
        text: it.text,
        time: it.date,
        url: it.url,
      })
    );

  // FB has no star aggregate. Return rating 0 so the summary layer derives the
  // rating from ALL cached FB reviews (not just this batch) — otherwise a small
  // incremental pull would skew the displayed rating.
  return { reviews, rating: 0, total: reviews.length };
}
