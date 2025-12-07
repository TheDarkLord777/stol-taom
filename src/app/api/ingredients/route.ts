import { NextRequest, NextResponse } from "next/server";
import { ingredientRepo } from "@/lib/ingredientRepo";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/ingredients
 * Returns all ingredients from cache (Redis or memory) with fast load.
 * Caching strategy:
 * 1. Memory cache (fastest, 3 days TTL by default)
 * 2. Redis cache (distributed, survives server restarts)
 * 3. Database (source of truth)
 */
export async function GET(req: NextRequest) {
  try {
    const ingredients = await ingredientRepo.list();
    return NextResponse.json({ ingredients }, { status: 200 });
  } catch (err) {
    logger.error("[api:ingredients] GET error", err);
    return NextResponse.json(
      { error: "Failed to fetch ingredients" },
      { status: 500 },
    );
  }
}
