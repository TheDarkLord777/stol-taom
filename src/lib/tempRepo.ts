import { getRedis } from "./redis";
import { type TempRegistration, TempStore } from "./store";

const TTL_SEC = 60 * 10; // 10 minutes

export const tempRepo = {
  async set(temp: TempRegistration) {
    const r = getRedis();
    if (!r) return TempStore.set(temp);
    const key = `reg:req:${temp.requestId}`;
    await r.set(key, JSON.stringify(temp), "EX", TTL_SEC);
    await r.set(`reg:phone:${temp.phone}`, temp.requestId, "EX", TTL_SEC);
  },
  async getByRequestId(
    requestId: string,
  ): Promise<TempRegistration | undefined> {
    const r = getRedis();
    if (!r) return TempStore.getByRequestId(requestId);
    const raw = await r.get(`reg:req:${requestId}`);
    return raw ? (JSON.parse(raw) as TempRegistration) : undefined;
  },
  async getByPhone(phone: string): Promise<TempRegistration | undefined> {
    const r = getRedis();
    if (!r) return TempStore.getByPhone(phone);
    const reqId = await r.get(`reg:phone:${phone}`);
    if (!reqId) return undefined;
    const raw = await r.get(`reg:req:${reqId}`);
    return raw ? (JSON.parse(raw) as TempRegistration) : undefined;
  },
  async deleteByRequestId(requestId: string) {
    const r = getRedis();
    if (!r) return TempStore.deleteByRequestId(requestId);
    const raw = await r.get(`reg:req:${requestId}`);
    if (raw) {
      const t = JSON.parse(raw) as TempRegistration;
      await r.del(`reg:phone:${t.phone}`);
    }
    await r.del(`reg:req:${requestId}`);
  },
  async setCooldown(phone: string, seconds: number) {
    const r = getRedis();
    if (!r) return TempStore.setCooldown(phone, seconds);
    const ttl = Math.max(1, seconds);
    await r.set(`reg:cooldown:${phone}`, "1", "EX", ttl);
    return Date.now() + ttl * 1000;
  },
  async getCooldownRemaining(phone: string) {
    const r = getRedis();
    if (!r) return TempStore.getCooldownRemaining(phone);
    const ttl = await r.ttl(`reg:cooldown:${phone}`);
    return ttl > 0 ? ttl : 0;
  },
};
