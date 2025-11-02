import type { PrismaClient } from "@prisma/client";
import { getPrisma, resetPrisma } from "./prisma";

function isTransientPrismaError(e: unknown): boolean {
  const eObj = e as Record<string, unknown> | undefined;
  const msg = String(eObj?.message ?? e ?? "");
  const code = eObj?.code as string | undefined;
  // Common transient cases: connection closed/reset/timeout/unreachable
  if (
    code === "P1001" ||
    code === "P1002" ||
    code === "P1008" ||
    code === "P1017"
  )
    return true;
  if (
    /connection.*closed|closed.*connection|ECONNRESET|ETIMEDOUT|Connection terminated/i.test(
      msg,
    )
  )
    return true;
  return false;
}

export async function dbTry<T>(
  fn: (p: PrismaClient) => Promise<T>,
): Promise<T> {
  try {
    return await fn(getPrisma());
  } catch (e) {
    if (!isTransientPrismaError(e)) throw e;
    // transient: recreate client and retry once
    resetPrisma();
    // small delay to let pooler settle
    await new Promise((r) => setTimeout(r, 150));
    return await fn(getPrisma());
  }
}
