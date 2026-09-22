// Provider-agnostic normalization + payload assembly.
// Providers map their own raw fields and call makeReview(); this file owns
// epoch/relative-time handling, de-dupe, incremental merge, and the per-source
// summary. Nothing here knows or cares which scraper produced the data.

function toEpoch(v) {
  if (!v) return 0;
  if (typeof v === "number") return v > 1e12 ? v : v * 1000; // sec vs ms
  const t = Date.parse(v);
  return Number.isNaN(t) ? 0 : t;
}

function relativeTime(epoch) {
  if (!epoch) return "";
  const d = Math.floor((Date.now() - epoch) / 86400000);
  if (d <= 0) return "today";
  if (d === 1) return "1 day ago";
  if (d < 30) return `${d} days ago`;
  const m = Math.floor(d / 30);
  if (m === 1) return "1 month ago";
  if (m < 12) return `${m} months ago`;
  const y = Math.floor(d / 365);
  return y === 1 ? "1 year ago" : `${y} years ago`;
}

// Build one unified review from a provider's mapped fields.
// Facebook has no stars: `recommended` (bool) maps to 5 (yes) / 1 (no).
export function makeReview({ source, author, avatar, rating, text, time, url, recommended }) {
  let r = Number(rating) || 0;
  if (source === "facebook" && !r) r = recommended === false ? 1 : 5;
  const epoch = toEpoch(time);
  return {
    source,
    author: author || "Anonymous",
    avatar: avatar || null,
    rating: Math.max(0, Math.min(5, Math.round(r))),
    text: (text || "").trim(),
    relativeTime: relativeTime(epoch),
    time: epoch,
    url: url || null,
  };
}

// Stable key for de-dupe across incremental refreshes; also the CSV "Review ID".
export function reviewKey(r) {
  const base =
    (r.source || "") + "|" + (r.author || "") + "|" + (r.time || "") + "|" + (r.text || "").slice(0, 40);
  let h = 0;
  for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) | 0;
  return (r.source || "x") + "-" + Math.abs(h).toString(36);
}

const round1 = (n) => Math.round(n * 10) / 10;
const avg = (arr) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0);

// Per-source {rating,total}: prefer a fresh aggregate, else the previous
// summary, else derive from the merged reviews. Never clobbers a good previous
// value with zeros from an empty incremental pull.
function sourceSummary(fresh, prevS, merged, source) {
  const list = merged.filter((r) => r.source === source);
  if (fresh && (fresh.total || fresh.reviews.length)) {
    const rating = fresh.rating || avg(list.map((r) => r.rating));
    return { rating: round1(rating), total: Math.max(fresh.total || 0, list.length) };
  }
  if (prevS && (prevS.total || prevS.rating)) return prevS;
  if (list.length) return { rating: round1(avg(list.map((r) => r.rating))), total: list.length };
  return { rating: 0, total: 0 };
}

// Merge freshly-fetched source results with the cached payload, de-dupe,
// sort newest-first, cap to `max`, and recompute the summary. This is what
// makes incremental (cutoff-based) fetching work. `google`/`facebook` are
// provider results ({ reviews, rating, total }) or null when not refreshed.
export function assemblePayload(widget, prev, { google, facebook }, max = 30) {
  // Only keep reviews at or above this rating (default 4★). Facebook "not
  // recommended" maps to 1★, so a 4★ floor also drops FB non-recommendations.
  const minRating = Number(widget.minRating ?? 4);

  const prevReviews = (prev && prev.reviews) || [];
  const incoming = [
    ...((google && google.reviews) || []),
    ...((facebook && facebook.reviews) || []),
  ];

  const seen = new Set();
  const merged = [];
  for (const r of [...incoming, ...prevReviews]) {
    const k = reviewKey(r);
    if (seen.has(k)) continue;
    seen.add(k);
    if ((r.rating || 0) < minRating) continue; // filter out low-star reviews
    merged.push(r);
  }
  merged.sort((a, b) => b.time - a.time);
  const capped = merged.slice(0, max);

  const prevSum = (prev && prev.summary) || {};
  const gSum = sourceSummary(google, prevSum.google, capped, "google");
  const fSum = sourceSummary(facebook, prevSum.facebook, capped, "facebook");

  const rated = capped.filter((r) => r.rating > 0);
  const overall = rated.length ? rated.reduce((s, r) => s + r.rating, 0) / rated.length : 0;

  return {
    id: widget.id,
    name: widget.name,
    theme: widget.theme || {},
    updatedAt: Date.now(),
    summary: {
      overall: round1(overall),
      total: capped.length,
      google: gSum,
      facebook: fSum,
    },
    reviews: capped,
  };
}
