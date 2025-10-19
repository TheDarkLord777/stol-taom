// WARNING: This is an in-memory store for demo/dev only. Replace with Redis/DB in production.

export type TempRegistration = {
  name?: string;
  phone: string;
  passwordPlain: string; // will be hashed only after verification
  requestId: string;
  createdAt: number;
  cooldownUntil?: number; // timestamp ms
};

export type User = {
  id: string;
  name?: string;
  phone: string;
  passwordHash: string;
  createdAt: number;
};

const tempByRequestId = new Map<string, TempRegistration>();
const tempByPhone = new Map<string, TempRegistration>();
const usersByPhone = new Map<string, User>();

export const TempStore = {
  set(temp: TempRegistration) {
    tempByRequestId.set(temp.requestId, temp);
    tempByPhone.set(temp.phone, temp);
  },
  upsertByPhone(phone: string, patch: Partial<TempRegistration>) {
    const cur = tempByPhone.get(phone);
    if (cur) {
      const next = { ...cur, ...patch } as TempRegistration;
      tempByPhone.set(phone, next);
      tempByRequestId.set(next.requestId, next);
      return next;
    }
    // If no current, require requestId to index by
    if (!patch.requestId)
      throw new Error("upsertByPhone requires requestId when creating new");
    const created: TempRegistration = {
      name: patch.name,
      phone,
      passwordPlain: patch.passwordPlain || "",
      requestId: patch.requestId,
      createdAt: patch.createdAt || Date.now(),
      cooldownUntil: patch.cooldownUntil,
    };
    tempByPhone.set(phone, created);
    tempByRequestId.set(created.requestId, created);
    return created;
  },
  getByRequestId(id: string) {
    return tempByRequestId.get(id);
  },
  getByPhone(phone: string) {
    return tempByPhone.get(phone);
  },
  setCooldown(phone: string, seconds: number) {
    const until = Date.now() + Math.max(1, seconds) * 1000;
    const cur = tempByPhone.get(phone);
    if (cur) {
      const next = { ...cur, cooldownUntil: until } as TempRegistration;
      tempByPhone.set(phone, next);
      tempByRequestId.set(next.requestId, next);
    } else {
      // create placeholder without password; requestId unknown, create temp id
      const reqId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const created: TempRegistration = {
        phone,
        requestId: reqId,
        passwordPlain: "",
        createdAt: Date.now(),
        cooldownUntil: until,
      };
      tempByPhone.set(phone, created);
      tempByRequestId.set(reqId, created);
    }
    return until;
  },
  getCooldownRemaining(phone: string) {
    const cur = tempByPhone.get(phone);
    if (!cur?.cooldownUntil) return 0;
    const ms = cur.cooldownUntil - Date.now();
    return ms > 0 ? Math.ceil(ms / 1000) : 0;
  },
  deleteByRequestId(id: string) {
    const t = tempByRequestId.get(id);
    if (t) tempByPhone.delete(t.phone);
    tempByRequestId.delete(id);
  },
};

export const UserStore = {
  get(phone: string) {
    return usersByPhone.get(phone);
  },
  create(user: User) {
    usersByPhone.set(user.phone, user);
    return user;
  },
};
