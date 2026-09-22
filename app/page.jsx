import { getAllWidgets } from "@/lib/widgets";
import { usingRedis } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const widgets = await getAllWidgets();

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px" }}>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>Reviews Widget</h1>
      <p style={{ color: "#5a6b67", marginTop: 0 }}>
        Self-hosted Google + Facebook reviews. Cache store:{" "}
        <strong>{usingRedis ? "Redis (KV)" : "local filesystem (.cache)"}</strong>.
      </p>
      <p>
        <a
          href="/admin"
          style={{
            display: "inline-block",
            background: "#1f6f5c",
            color: "#fff",
            padding: "9px 16px",
            borderRadius: 9,
            textDecoration: "none",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          Open admin dashboard →
        </a>
      </p>

      <h2 style={{ fontSize: 18, marginTop: 32 }}>Embed on any site</h2>
      <p style={{ color: "#5a6b67" }}>
        Drop this where the reviews should appear (works in Webflow embed
        blocks). Include the script once per page.
      </p>
      <pre style={codeStyle}>
{`<div data-reviews-widget="WIDGET_ID"></div>
<script src="https://YOUR-DOMAIN/embed.js" async></script>`}
      </pre>

      <h2 style={{ fontSize: 18, marginTop: 32 }}>Configured widgets</h2>
      <ul style={{ lineHeight: 1.9 }}>
        {widgets.map((w) => (
          <li key={w.id}>
            <code>{w.id}</code> — {w.name}{" "}
            <a href={`/demo?id=${w.id}`} style={{ color: "#1f6f5c" }}>
              preview
            </a>{" "}
            ·{" "}
            <a href={`/api/reviews/${w.id}`} style={{ color: "#1f6f5c" }}>
              JSON
            </a>{" "}
            ·{" "}
            <a href={`/api/export/${w.id}`} style={{ color: "#1f6f5c" }}>
              CSV
            </a>
          </li>
        ))}
      </ul>

      <p style={{ color: "#8a9994", fontSize: 13, marginTop: 40 }}>
        Force a data refresh: <code>GET /api/cron/refresh</code> (send
        <code> Authorization: Bearer $CRON_SECRET</code> if set).
      </p>
    </main>
  );
}

const codeStyle = {
  background: "#0f1a17",
  color: "#e9f3ef",
  padding: 16,
  borderRadius: 10,
  fontSize: 13,
  overflowX: "auto",
};
