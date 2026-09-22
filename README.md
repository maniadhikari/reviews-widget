# Reviews Widget

Self-hosted Google + Facebook reviews — an Elfsight "All-in-One Reviews" replacement.
Pulls reviews via **Apify** actors, caches them in **KV/Redis**, refreshes on a
**Vercel Cron**, and gives you two ways to use the data:

1. **Embeddable widget** — one `<script>` tag, renders a carousel (Shadow DOM, so
   host CSS like Webflow's can't break it).
2. **CSV export** — download a Webflow-CMS-ready CSV and import it into a Collection.

---

## How it works

```
Vercel Cron (monthly) / admin "Refresh"
     │
     ▼
/api/cron/refresh ──► Apify actors (Google + Facebook) ──► normalize ──► KV cache
                                                                        │
                          ┌─────────────────────────────────────────────┤
                          ▼                                             ▼
              /api/reviews/<id>  (JSON, CORS)              /api/export/<id>  (CSV)
                          │                                             │
                          ▼                                             ▼
                 embed.js widget on                         Webflow CMS import
                 client sites / Webflow
```

Providers (Apify actors):
- Google: `compass/google-maps-reviews-scraper`
- Facebook: `apify/facebook-reviews-scraper` (recommendation-based; recommend → 5★)

**Cost driver = reviews scraped per fetch, NOT page views.** Reviews are cached
and served to every visitor for free. Apify bills per review scraped, so:
- First pull: `REVIEWS_LIMIT` (30) x locations. 100 sites = 3,000 reviews — inside
  Apify's free **$5/mo credit (~8,333 reviews)**, so ≈ **$0**.
- Refreshes are **incremental** — a `cutoff` (actor date filter) fetches only
  reviews newer than what's cached, so a monthly (or never) refresh stays free.

The 30-per-location cap is set by `REVIEWS_LIMIT` (or per-widget `maxReviews`).

---

## Setup

```bash
npm install
cp .env.example .env.local   # fill in APIFY_TOKEN
npm run dev                   # http://localhost:3000
```

Locally, with `KV_REST_API_*` unset, the cache falls back to `.cache/` on disk —
no Redis needed. Visit `/` for the dashboard, `/demo?id=<id>` to preview a widget.

To pull real data locally: keep `npm run dev` running, then in another terminal:

```bash
npm run refresh
```

Or just open `/api/reviews/<id>` — a cold cache fills itself on first request.

---

## Admin dashboard (`/admin`)

Everything is managed from a UI — no editing JSON, no curling endpoints:

- **Add / edit / delete** client locations (name, Google place_id or Maps URL,
  Facebook page URL, header text, accent color, max reviews).
- **Pull** reviews for one location or **Refresh all** (this is what spends
  Apify credit).
- **Preview** the widget, download the **CSV**, or copy the **embed code** per
  location.
- See review counts and last-updated per location at a glance.

Configs are stored in KV (seeded once from `config/widgets.json`), so adding a
client is instant — no redeploy.

**Auth:** set `ADMIN_PASSWORD` to protect `/admin` and the admin API. Left blank,
the dashboard is open (fine for local dev only — always set it in production).

- Find a Google **place_id**: https://developers.google.com/maps/documentation/places/web-service/place-id

---

## Using it — Option A: embed widget

Paste into any page (including a Webflow **Embed** element):

```html
<div data-reviews-widget="client-slug"></div>
<script src="https://YOUR-DOMAIN/embed.js" async></script>
```

Multiple widgets per page are fine; include the script once.

## Using it — Option B: Webflow CMS via CSV

1. Download `https://YOUR-DOMAIN/api/export/client-slug` (add `?source=google` or
   `?source=facebook` to filter).
2. In Webflow, create a **Reviews** CMS Collection with fields matching the CSV
   headers: Name, Rating (number), Review Text, Source, Author Name,
   Avatar (image), Relative Time, Date (date), Review URL, Review ID.
3. Collection settings → **Import** → upload the CSV.
4. Design the Collection List however you like.

> CSV is a **manual** re-upload whenever reviews change. For hands-off syncing,
> see the upgrade below.

---

## Deploy (Vercel)

1. Push to a Git repo, import into Vercel.
2. Add the **Upstash Redis** (or Vercel KV) integration → it injects
   `KV_REST_API_URL` + `KV_REST_API_TOKEN`.
3. Set env vars: `APIFY_TOKEN`, `ADMIN_PASSWORD`,
   `CRON_SECRET` (`openssl rand -hex 32`), optionally `REVIEWS_LIMIT`.
4. The cron in [`vercel.json`](vercel.json) refreshes everything **monthly**
   (06:00 UTC on the 1st). Trigger manually anytime: `GET /api/cron/refresh`
   with `Authorization: Bearer $CRON_SECRET`. To refresh only when you feel like
   it, delete the `crons` block and just hit the endpoint by hand.

For many locations use Vercel Pro (300s functions) so the whole batch finishes
in one run; on Hobby (60s cap) shard the refresh or run it locally.

---

## Possible upgrade: auto-sync to Webflow CMS (no manual CSV)

Instead of downloading CSVs, the cron job can push straight into Webflow via the
**Webflow Data API v2** (`PATCH /collections/{id}/items`), upserting by the
`Review ID` field. That gives you the CMS/native-design benefits *and* Elfsight's
hands-off auto-refresh. Ask and this can be wired into `lib/refresh.js`.

---

## Notes / caveats

- **Facebook** has no official reviews API and no star ratings — the Apify actor
  returns recommend yes/no, which we map to 5★/1★. Leave `sources.facebook` out
  for a Google-only location.
- Respect Google/Meta display terms (attribution, don't misrepresent ratings).
- Apify actors are third-party maintained and may tweak field names; the mapping
  lives in `lib/apify.js`. If a source returns empty, log the raw dataset items
  there and compare against the actor's current output schema.
