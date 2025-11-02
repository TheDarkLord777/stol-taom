import crypto from "node:crypto";
import { prisma } from "./prisma";
import { type User, UserStore } from "./store";

export const userRepo = {
  async getByPhone(phone: string): Promise<User | null> {
    try {
      const u = await prisma.user.findUnique({ where: { phone } });
      if (!u) return null;
      return {
        id: u.id,
        phone: u.phone,
        name: u.name ?? undefined,
        passwordHash: u.passwordHash,
        createdAt: u.createdAt.getTime(),
      };
    } catch {
      return UserStore.get(phone) ?? null;
    }
  },
  async create(data: {
    phone: string;
    name?: string;
    passwordHash: string;
  }): Promise<User> {
    try {
      const u = await prisma.user.create({
        data: {
          phone: data.phone,
          name: data.name ?? null,
          passwordHash: data.passwordHash,
        },
      });
      return {
        id: u.id,
        phone: u.phone,
        name: u.name ?? undefined,
        passwordHash: u.passwordHash,
        createdAt: u.createdAt.getTime(),
      };
    } catch {
      return UserStore.create({
        id: crypto.randomUUID(),
        phone: data.phone,
        name: data.name,
        passwordHash: data.passwordHash,
        createdAt: Date.now(),
      });
    }
  },
};
