import { getRedis } from "./redis";

type ForgotRecord = {
  requestId: string;
  phone: string;
  userId?: string;
  createdAt: number;
};

const TTL_SEC = 60 * 10; // 10 minutes

export const forgotRepo = {
  async set(rec: ForgotRecord) {
    const r = getRedis();
    if (!r) {
      // fallback to in-memory via global map
      const key = `__forgot:req:${rec.requestId}`;
      (globalThis as any)[key] = JSON.stringify(rec);
      (globalThis as any)[`__forgot:phone:${rec.phone}`] = rec.requestId;
      return;
    }
    await r.set(
      `forgot:req:${rec.requestId}`,
      JSON.stringify(rec),
      "EX",
      TTL_SEC,
    );
    await r.set(`forgot:phone:${rec.phone}`, rec.requestId, "EX", TTL_SEC);
  },
  async getByRequestId(requestId: string): Promise<ForgotRecord | undefined> {
    const r = getRedis();
    if (!r) {
      const key = `__forgot:req:${requestId}`;
      const raw = (globalThis as any)[key];
      return raw ? (JSON.parse(raw) as ForgotRecord) : undefined;
    }
    const raw = await r.get(`forgot:req:${requestId}`);
    return raw ? (JSON.parse(raw) as ForgotRecord) : undefined;
  },
  async deleteByRequestId(requestId: string) {
    const r = getRedis();
    if (!r) {
      const key = `__forgot:req:${requestId}`;
      const raw = (globalThis as any)[key];
      if (raw) {
        const rec = JSON.parse(raw) as ForgotRecord;
        delete (globalThis as any)[`__forgot:phone:${rec.phone}`];
      }
      delete (globalThis as any)[key];
      return;
    }
    const raw = await r.get(`forgot:req:${requestId}`);
    if (raw) {
      const rec = JSON.parse(raw) as ForgotRecord;
      await r.del(`forgot:phone:${rec.phone}`);
    }
    await r.del(`forgot:req:${requestId}`);
  },
  async setCooldown(phone: string, seconds: number) {
    const r = getRedis();
    if (!r) {
      const until = Date.now() + Math.max(1, seconds) * 1000;
      (globalThis as any)[`__forgot:cooldown:${phone}`] = String(until);
      return until;
    }
    const ttl = Math.max(1, seconds);
    await r.set(`forgot:cooldown:${phone}`, "1", "EX", ttl);
    return Date.now() + ttl * 1000;
  },
  async getCooldownRemaining(phone: string) {
    const r = getRedis();
    if (!r) {
      const raw = (globalThis as any)[`__forgot:cooldown:${phone}`];
      if (!raw) return 0;
      const until = Number(raw || 0);
      const ms = until - Date.now();
      return ms > 0 ? Math.ceil(ms / 1000) : 0;
    }
    const ttl = await r.ttl(`forgot:cooldown:${phone}`);
    return ttl > 0 ? ttl : 0;
  },
};
