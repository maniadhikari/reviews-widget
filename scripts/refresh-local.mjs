// Force a data refresh against a running dev server.
// Usage: start `npm run dev` in one terminal, then `npm run refresh`.
// (Uses the /api/cron/refresh route so it shares the exact production path.)

const base = process.env.BASE_URL || "http://localhost:3000";
const secret = process.env.CRON_SECRET;

const res = await fetch(`${base}/api/cron/refresh`, {
  headers: secret ? { Authorization: `Bearer ${secret}` } : {},
});

const json = await res.json().catch(() => ({}));
console.log(JSON.stringify(json, null, 2));
if (!res.ok) process.exit(1);
