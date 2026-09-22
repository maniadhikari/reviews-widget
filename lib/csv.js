// Turn normalized reviews into a Webflow-CMS-friendly CSV.
//
// Webflow CMS import notes:
// - First row is headers; each header maps to a CMS field on import.
// - "Name" is required and becomes the item name/slug (Webflow auto-dedupes
//   slugs, so duplicate authors get -2, -3 suffixes — harmless).
// - "Avatar" holds an image URL; map it to an Image field and Webflow will
//   pull the image in on import.
// - Re-importing creates NEW items unless you match on a field during import,
//   so to avoid duplicates either import into a fresh collection or use the
//   "Review ID" column to de-dupe.

import { reviewKey } from "@/lib/normalize";

function cell(v) {
  var s = v == null ? "" : String(v);
  // Escape per RFC 4180: wrap in quotes, double any internal quotes.
  if (/[",\n\r]/.test(s)) {
    s = '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

const HEADERS = [
  "Name",
  "Review ID",
  "Source",
  "Rating",
  "Review Text",
  "Author Name",
  "Avatar",
  "Relative Time",
  "Date",
  "Review URL",
];

export function reviewsToCsv(reviews) {
  const rows = [HEADERS.map(cell).join(",")];
  for (const r of reviews) {
    const iso = r.time ? new Date(r.time).toISOString() : "";
    rows.push(
      [
        r.author || "Anonymous",
        reviewKey(r),
        r.source === "facebook" ? "Facebook" : "Google",
        r.rating || "",
        r.text || "",
        r.author || "",
        r.avatar || "",
        r.relativeTime || "",
        iso,
        r.url || "",
      ]
        .map(cell)
        .join(",")
    );
  }
  // Prepend UTF-8 BOM so Excel/Sheets read accents correctly.
  return "﻿" + rows.join("\r\n");
}
