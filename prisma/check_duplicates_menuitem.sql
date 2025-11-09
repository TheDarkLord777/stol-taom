SELECT "cartId", "menuItemId", COUNT(*) FROM myapp."CartItem" GROUP BY "cartId", "menuItemId" HAVING COUNT(*) > 1;
