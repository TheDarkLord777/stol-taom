import Redis from "ioredis";

let client: Redis | null = null;

export function getRedis(): Redis | null {
  const enabled =
    (process.env.ENABLE_REDIS || "").toLowerCase() === "true" ||
    process.env.ENABLE_REDIS === "1";
  if (!enabled) return null;
  if (client !== null) return client;
  const url = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL; // prefer standard URL
  const password = process.env.REDIS_PASSWORD;
  if (!url) return (client = null);
  try {
    client = new Redis(url, password ? { password } : {});
    return client;
  } catch {
    client = null;
    return null;
  }
}
