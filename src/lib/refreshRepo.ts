import { getRedis } from "./redis";

// Minimal refresh-token registry. When Redis is disabled, behaves as a no-op
// (revocation/rotation checks are skipped to preserve current stateless mode).

const PREFIX = "auth:rt:"; // Key by JTI

function _isEnabled() {
  return getRedis() !== null;
}

export const refreshRepo = {
  // Store JTI with TTL seconds
  async store(jti: string, userId: string, ttlSec: number) {
    const r = getRedis();
    if (!r) return true; // no-op when disabled
    await r.set(PREFIX + jti, userId, "EX", Math.max(1, ttlSec));
    return true;
  },
  async exists(jti: string) {
    const r = getRedis();
    if (!r) return true; // treat as valid in stateless fallback
    const v = await r.exists(PREFIX + jti);
    return v === 1;
  },
  async revoke(jti: string) {
    const r = getRedis();
    if (!r) return true; // no-op
    await r.del(PREFIX + jti);
    return true;
  },
  async rotate(oldJti: string, newJti: string, userId: string, ttlSec: number) {
    const r = getRedis();
    if (!r) return true; // no-op
    const pipe = r.multi();
    pipe.del(PREFIX + oldJti);
    pipe.set(PREFIX + newJti, userId, "EX", Math.max(1, ttlSec));
    await pipe.exec();
    return true;
  },
};
