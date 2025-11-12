import { PrismaClient } from "@prisma/client";
import { getRedis } from "./redis";
import { delKeys, setLastSync } from "./redis";
import { logger } from "./logger";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

let prisma: PrismaClient =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["error", "warn"],
  });

// Optional: log raw SQL queries when explicitly enabled (avoid in prod by default)
// Only enable full SQL logging when explicitly requested. Console.info is used so
// output is visible in Next/Turbopack dev logs (console.debug can be filtered).
if (process.env.PRISMA_LOG_QUERIES === "1") {
  // Use any cast to avoid TypeScript typing issues for the debug event handler
  (prisma as any).$on("query", (e: any) => {
    // e.query - the SQL string (with $1.. params), e.params - bound params array, e.duration
    // Keep the output compact but include params and duration for reproduceability.
    // eslint-disable-next-line no-console
    console.info(`[prisma:query] ${e.query}`);
    // eslint-disable-next-line no-console
    console.info(`[prisma:params] ${JSON.stringify(e.params)} duration:${e.duration ?? "-"}ms`);
  });
}

// Timing middleware: measures duration for each Prisma call and warns on slow queries
prisma.$use(async (params, next) => {
  const start = Date.now();
  const result = await next(params);
  const duration = Date.now() - start;

  const slowThreshold = Number(process.env.PRISMA_SLOW_MS || 100);
  if (duration >= slowThreshold) {
    // eslint-disable-next-line no-console
    console.warn(`[prisma] slow query: ${params.model}.${params.action} took ${duration}ms`, {
      model: params.model,
      action: params.action,
      duration,
      // Do not log args by default to avoid PII — enable manually if needed
    });
  }

  return result;
});

// Invalidate Redis cache for known models on write operations.
prisma.$use(async (params, next) => {
  // only act on write operations
  const writeActions = ["create", "update", "delete", "upsert", "updateMany", "deleteMany"];
  const res = await next(params);
  try {
    if (writeActions.includes(params.action)) {
      const r = getRedis();
      if (r) {
        // Decide which cache patterns to invalidate based on model
        const model = params.model;
        const patterns: string[] = [];
        if (!model) return res;
        switch (model) {
          case "Restaurant":
            patterns.push("menu:restaurants*");
            break;
          case "MenuItem":
            patterns.push("menu:menuitems*");
            break;
          case "Ingredient":
            patterns.push("menu:ingredients*");
            break;
          case "MenuItemOnRestaurant":
            patterns.push("menu:restaurants*");
            patterns.push("menu:menuitems*");
            break;
          case "Reservation":
            patterns.push("reservations*");
            break;
          case "RestaurantCapacity":
            patterns.push("restaurant:capacity*");
            break;
          default:
            // keep default small to avoid over-deleting
            break;
        }
        for (const p of patterns) {
          try {
            // use SCAN via listKeys helper to avoid blocking the server
            const keys = await (async () => {
              // import-local to avoid cycle issues
              const { listKeys } = await import("./redis");
              return listKeys(p);
            })();
            if (keys.length > 0) {
              await delKeys(keys);
              logger.info("prisma:cache:invalidated", { model, pattern: p, keys: keys.length });
            }
          } catch (err) {
            logger.warn("prisma:cache:invalidate:error", { model, pattern: p, err });
          }
        }
        await setLastSync();
      }
    }
  } catch (err) {
    // don't let cache errors block DB operations
    logger.warn("prisma:cache:invalidator:failed", err);
  }
  return res;
});

export function resetPrisma() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    prisma?.$disconnect?.();
  } catch { }
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
