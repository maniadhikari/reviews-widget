// Widget/location configs, stored in the KV/cache store so the admin UI can add
// and edit clients without a redeploy. config/widgets.json is used ONCE to seed
// an empty store, then KV is the source of truth.

import { promises as fs } from "node:fs";
import path from "node:path";
import { kvGet, kvSet } from "@/lib/store";

const INDEX_KEY = "config:widgets";

async function seedFromFile() {
  try {
    const raw = await fs.readFile(
      path.join(process.cwd(), "config", "widgets.json"),
      "utf8"
    );
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.widgets) ? parsed.widgets : [];
  } catch {
    return [];
  }
}

export async function getAllWidgets() {
  let list = await kvGet(INDEX_KEY);
  if (!Array.isArray(list)) {
    list = await seedFromFile();
    if (list.length) await kvSet(INDEX_KEY, list);
  }
  return list;
}

export async function getWidget(id) {
  const all = await getAllWidgets();
  return all.find((w) => w.id === id) || null;
}

export async function saveWidget(widget) {
  const all = await getAllWidgets();
  const idx = all.findIndex((w) => w.id === widget.id);
  if (idx >= 0) all[idx] = widget;
  else all.push(widget);
  await kvSet(INDEX_KEY, all);
  return widget;
}

export async function deleteWidget(id) {
  const all = await getAllWidgets();
  const next = all.filter((w) => w.id !== id);
  await kvSet(INDEX_KEY, next);
  return all.length !== next.length;
}
