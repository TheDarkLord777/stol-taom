-- CreateTable
CREATE TABLE "RestaurantCapacity" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "table2" INTEGER NOT NULL DEFAULT 5,
    "table4" INTEGER NOT NULL DEFAULT 5,
    "table6" INTEGER NOT NULL DEFAULT 5,
    "table8" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RestaurantCapacity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantCapacity_restaurantId_key" ON "RestaurantCapacity"("restaurantId");

-- AddForeignKey
ALTER TABLE "RestaurantCapacity" ADD CONSTRAINT "RestaurantCapacity_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
