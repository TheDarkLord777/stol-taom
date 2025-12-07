-- DropForeignKey
ALTER TABLE "MenuItemOnRestaurant" DROP CONSTRAINT "MenuItemOnRestaurant_menuItemId_fkey";

-- DropForeignKey
ALTER TABLE "MenuItemOnRestaurant" DROP CONSTRAINT "MenuItemOnRestaurant_restaurantId_fkey";

-- AddForeignKey
ALTER TABLE "MenuItemOnRestaurant" ADD CONSTRAINT "MenuItemOnRestaurant_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemOnRestaurant" ADD CONSTRAINT "MenuItemOnRestaurant_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
