"use client";

import { useEffect, useState } from "react";

export default function Demo() {
  const [id, setId] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const wid = params.get("id") || "alliance-carmel";
    setId(wid);

    // Load the embed script (same origin as this demo).
    const s = document.createElement("script");
    s.src = "/embed.js";
    s.async = true;
    document.body.appendChild(s);
    return () => s.remove();
  }, []);

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 24px" }}>
      <p style={{ color: "#8a9994", fontSize: 13 }}>
        Demo preview of widget: <code>{id}</code>
      </p>
      {id ? <div data-reviews-widget={id} /> : null}
    </main>
  );
}
