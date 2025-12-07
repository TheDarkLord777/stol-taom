#!/usr/bin/env node
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const phone = process.argv[2];
  const restaurantId = process.argv[3];

  if (!phone || !restaurantId) {
    console.error("Usage: node scripts/add-manager.cjs <phone> <restaurantId>");
    process.exit(1);
  }

  console.log("Looking up user by phone:", phone);
  let user = await prisma.user.findUnique({ where: { phone } });
  let tempPassword = null;

  if (!user) {
    // create a temporary password for the new user
    tempPassword = Math.random().toString(36).slice(2, 10);
    const passwordHash = bcrypt.hashSync(tempPassword, 10);
    user = await prisma.user.create({
      data: {
        phone,
        passwordHash,
        name: `Manager ${phone}`,
      },
    });
    console.log("Created new user:", user.id);
  } else {
    console.log("Found existing user:", user.id);
  }

  // ensure mapping doesn't already exist
  const existing = await prisma.restaurantManager.findFirst({
    where: { restaurantId, userId: user.id },
  });
  if (existing) {
    console.log("User is already a manager for restaurant", restaurantId);
    if (tempPassword)
      console.log("Temp password (for new user):", tempPassword);
    process.exit(0);
  }

  await prisma.restaurantManager.create({
    data: { restaurantId, userId: user.id },
  });
  console.log(
    "RestaurantManager mapping created for user",
    user.id,
    "->",
    restaurantId,
  );
  if (tempPassword) console.log("Temp password (for new user):", tempPassword);
  console.log(
    "User can now sign in and access the management page once logged in.",
  );
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(2);
  })
  .finally(() => prisma.$disconnect());
