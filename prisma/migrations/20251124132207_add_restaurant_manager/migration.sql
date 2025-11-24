-- CreateTable
CREATE TABLE "RestaurantManager" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RestaurantManager_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RestaurantManager_userId_idx" ON "RestaurantManager"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantManager_restaurantId_userId_key" ON "RestaurantManager"("restaurantId", "userId");

-- AddForeignKey
ALTER TABLE "RestaurantManager" ADD CONSTRAINT "RestaurantManager_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantManager" ADD CONSTRAINT "RestaurantManager_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
