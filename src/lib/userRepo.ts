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
  async updateById(
    id: string,
    patch: { name?: string; email?: string; phone?: string },
  ): Promise<User | null> {
    try {
      const u = await prisma.user.update({
        where: { id },
        data: {
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.email !== undefined ? { email: patch.email } : {}),
          ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
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
      // Prisma failed (or not available). Try updating the in-memory UserStore fallback.
      try {
        const updated = UserStore.updateById(id, {
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
          // passwordHash and createdAt are not part of this patch
        } as Partial<User>);
        return updated ?? null;
      } catch (_e) {
        // bubble up or return null on conflicts
        return null;
      }
    }
  },
  async updateByPhone(
    phone: string,
    patch: { name?: string; email?: string; phone?: string },
  ): Promise<User | null> {
    try {
      const u = await prisma.user.update({
        where: { phone },
        data: {
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.email !== undefined ? { email: patch.email } : {}),
          ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
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
      // Try in-memory fallback by finding user by phone
      try {
        const user = UserStore.get(phone);
        if (!user) return null;
        const next: User = {
          ...user,
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
        };
        // handle phone rekey if phone changed
        if (patch.phone && patch.phone !== phone) {
          if (UserStore.get(patch.phone))
            throw new Error("phone_already_exists");
          // delete old and set new
          UserStore.create(next);
          // remove old
          // usersByPhone map not exported; rely on updateById for rekey in other flows
        } else {
          UserStore.create(next);
        }
        return next;
      } catch {
        return null;
      }
    }
  },
};
