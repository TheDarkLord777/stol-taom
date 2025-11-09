/*
  Warnings:

  - A unique constraint covering the columns `[cartId,clientItemId]` on the table `CartItem` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "clientItemId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_clientItemId_key" ON "CartItem"("cartId", "clientItemId");
