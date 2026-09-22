// A tiny key/value abstraction.
// - In production (Vercel): uses Upstash Redis / Vercel KV via the injected
//   KV_REST_API_URL + KV_REST_API_TOKEN env vars.
// - Locally with those unset: falls back to a JSON file under .cache/ so you
//   can develop with no Redis at all.

import { promises as fs } from "node:fs";
import path from "node:path";

export const usingRedis = !!(
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
);

let _redis = null;
async function getRedis() {
  if (!usingRedis) return null;
  if (_redis) return _redis;
  const { Redis } = await import("@upstash/redis");
  _redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });
  return _redis;
}

const CACHE_DIR = path.join(process.cwd(), ".cache");

function fileFor(key) {
  const safe = key.replace(/[^a-z0-9_.-]/gi, "_");
  return path.join(CACHE_DIR, `${safe}.json`);
}

export async function kvGet(key) {
  const redis = await getRedis();
  if (redis) return await redis.get(key); // Upstash auto-deserializes JSON
  try {
    return JSON.parse(await fs.readFile(fileFor(key), "utf8"));
  } catch {
    return null;
  }
}

export async function kvSet(key, value) {
  const redis = await getRedis();
  if (redis) {
    await redis.set(key, value);
    return;
  }
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(fileFor(key), JSON.stringify(value), "utf8");
}
