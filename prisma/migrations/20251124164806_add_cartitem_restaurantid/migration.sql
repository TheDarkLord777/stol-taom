-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "restaurantId" TEXT;

-- CreateIndex
CREATE INDEX "CartItem_restaurantId_idx" ON "CartItem"("restaurantId");
