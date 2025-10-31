import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

let prisma: PrismaClient =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["error", "warn"],
  });

export function resetPrisma() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    prisma?.$disconnect?.();
  } catch {}
  prisma = new PrismaClient({
    log: ["error", "warn"],
  });
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
  return prisma;
}

export function getPrisma() {
  return prisma;
}

export { prisma };

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
