import Redis from "ioredis";
import { inspect } from "util";

import { logger } from "./logger";

let client: Redis | null = null;

/**
 * Returns an ioredis client or null if Redis is disabled / not configured.
 * Notes:
 * - Prefer setting REDIS_URL to a redis://... URL for full ioredis support.
 * - UPSTASH_REDIS_REST_URL (http(s)://...) is not supported by ioredis; in that
 *   case the function will log a warning and return null. This keeps existing
 *   code paths working while avoiding runtime errors.
 */
export function getRedis(): Redis | null {
  const enabled =
    (process.env.ENABLE_REDIS || "").toLowerCase() === "true" ||
    process.env.ENABLE_REDIS === "1";
  if (!enabled) return null;
  if (client !== null) return client;

  const url = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
  const password = process.env.REDIS_PASSWORD;
  if (!url) {
    logger.warn("getRedis: REDIS_URL not set; Redis disabled");
    client = null;
    return null;
  }

  // ioredis supports redis:// and rediss:// urls. If a plain http(s) URL is
  // provided (common for Upstash REST), we don't try to use ioredis because it
  // will fail — explicitly require a redis URL for full functionality.
  if (url.startsWith("http://") || url.startsWith("https://")) {
    logger.warn(
      "getRedis: HTTP(S) Redis URL detected (Upstash REST?). ioredis client not created. Set REDIS_URL with a redis:// URL for full Redis support.",
    );
    client = null;
    return null;
  }

  try {
    client = password ? new Redis(url, { password }) : new Redis(url);
    // Attach some helpful listeners for runtime diagnostics
    client.on("error", (err) => logger.error("redis:error", err));
    client.on("connect", () => logger.info("redis:connect"));
    client.on("ready", () => logger.info("redis:ready"));
    logger.info("getRedis: connected to Redis", inspect(url, { depth: 0 }));
    return client;
  } catch (err) {
    logger.error("getRedis: failed to create ioredis client", err);
    client = null;
    return null;
  }
}

// Convenience helpers used by codebase and the Redis Debugger UI
export async function listKeys(pattern = "*") {
  const r = getRedis();
  if (!r) return [] as string[];
  // Use SCAN to avoid blocking Redis on large keyspaces
  const keys: string[] = [];
  let cursor = "0";
  do {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [nextCursor, arr] = (await (r as any).scan(
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      100,
    )) as any;
    cursor = String(nextCursor);
    for (const k of arr) keys.push(k);
  } while (cursor !== "0");
  return keys;
}

export async function delKeys(keys: string[] | string) {
  const r = getRedis();
  if (!r) return 0;
  if (typeof keys === "string") keys = [keys];
  if (keys.length === 0) return 0;
  try {
    const rv = await r.del(...keys);
    logger.info("redis:del", { count: rv, keys: keys.length });
    return rv;
  } catch (err) {
    logger.error("redis:del:error", err);
    return 0;
  }
}

export async function ttl(key: string) {
  const r = getRedis();
  if (!r) return -2; // key does not exist when redis disabled
  try {
    return await r.ttl(key);
  } catch (err) {
    logger.error("redis:ttl:error", err);
    return -2;
  }
}

export async function setLastSync(ts = Date.now()) {
  const r = getRedis();
  if (!r) return;
  try {
    await r.set("meta:last_sync", String(ts));
  } catch (err) {
    logger.warn("setLastSync failed", err);
  }
}

export async function getLastSync() {
  const r = getRedis();
  if (!r) return null;
  try {
    const raw = await r.get("meta:last_sync");
    return raw ? Number(raw) : null;
  } catch (err) {
    logger.warn("getLastSync failed", err);
    return null;
  }
}
