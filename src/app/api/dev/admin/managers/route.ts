import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/jwtAuth";
import { getRedis } from "@/lib/redis";
import { userRepo } from "@/lib/userRepo";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const devEnabled =
  process.env.NODE_ENV !== "production" ||
  process.env.DEV_ADMIN_ENABLED === "true";

async function checkCanManage(
  prisma: any,
  restaurantId: string,
  user: { id: string; phone: string },
) {
  // allow if user is already a manager in DB
  try {
    const exists = await prisma.restaurantManager.findFirst({
      where: { restaurantId, userId: user.id },
    });
    if (exists) return true;
  } catch {}
  // fallback: check redis dev owner mapping
  try {
    const r = getRedis();
    if (r) {
      const ownerKey = `dev:restaurant:owner:${restaurantId}`;
      const ownerPhone = await r.get(ownerKey);
      if (ownerPhone && ownerPhone === user.phone) return true;
    }
  } catch {}
  return false;
}

export async function GET(req: NextRequest) {
  if (!devEnabled)
    return NextResponse.json({ error: "Dev admin disabled" }, { status: 403 });
  const user = await getUserFromRequest(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const restaurantId = url.searchParams.get("restaurantId");
  if (!restaurantId)
    return NextResponse.json(
      { error: "restaurantId required" },
      { status: 400 },
    );
  try {
    const prisma = getPrisma();
    const rows = await prisma.restaurantManager.findMany({
      where: { restaurantId },
      include: { user: true },
    });
    const items = rows.map((r: any) => ({
      userId: r.userId,
      phone: r.user?.phone,
      name: r.user?.name,
      createdAt: r.createdAt?.getTime?.(),
    }));
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!devEnabled)
    return NextResponse.json({ error: "Dev admin disabled" }, { status: 403 });
  const user = await getUserFromRequest(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const { restaurantId, phone, userId } = body as {
      restaurantId?: string;
      phone?: string;
      userId?: string;
    };
    if (!restaurantId)
      return NextResponse.json(
        { error: "restaurantId required" },
        { status: 400 },
      );
    const prisma = getPrisma();
    const allowed = await checkCanManage(prisma, restaurantId, user);
    if (!allowed)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    let targetUserId = userId;
    let autoCreatedTemp: string | undefined;
    if (phone && !targetUserId) {
      let u = await userRepo.getByPhone(phone);
      if (!u) {
        // auto-create user with a temporary password
        const temp = crypto.randomBytes(6).toString("base64url");
        const hash = bcrypt.hashSync(temp, 10);
        u = await userRepo.create({
          phone,
          name: undefined,
          passwordHash: hash,
        });
        autoCreatedTemp = temp;
      }
      if (!u)
        return NextResponse.json(
          { error: "User creation failed" },
          { status: 500 },
        );
      targetUserId = u.id;
    }
    if (!targetUserId)
      return NextResponse.json(
        { error: "userId or phone required" },
        { status: 400 },
      );

    try {
      await prisma.restaurantManager.create({
        data: { restaurantId, userId: targetUserId },
      });
    } catch (e) {
      // could be unique constraint; ignore
    }
    return NextResponse.json({ ok: true, tempPassword: autoCreatedTemp });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!devEnabled)
    return NextResponse.json({ error: "Dev admin disabled" }, { status: 403 });
  const user = await getUserFromRequest(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const { restaurantId, userId } = body as {
      restaurantId?: string;
      userId?: string;
    };
    if (!restaurantId || !userId)
      return NextResponse.json(
        { error: "restaurantId and userId required" },
        { status: 400 },
      );
    const prisma = getPrisma();
    const allowed = await checkCanManage(prisma, restaurantId, user);
    if (!allowed)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    try {
      await prisma.restaurantManager.deleteMany({
        where: { restaurantId, userId },
      });
    } catch {}
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
