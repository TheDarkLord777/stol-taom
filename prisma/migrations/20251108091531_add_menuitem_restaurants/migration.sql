-- CreateTable
CREATE TABLE "MenuItemOnRestaurant" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuItemOnRestaurant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MenuItemOnRestaurant_menuItemId_restaurantId_key" ON "MenuItemOnRestaurant"("menuItemId", "restaurantId");

-- AddForeignKey
ALTER TABLE "MenuItemOnRestaurant" ADD CONSTRAINT "MenuItemOnRestaurant_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemOnRestaurant" ADD CONSTRAINT "MenuItemOnRestaurant_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
