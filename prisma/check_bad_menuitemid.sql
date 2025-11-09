SELECT * FROM myapp."CartItem" WHERE "menuItemId" NOT IN (SELECT id FROM myapp."MenuItem") ORDER BY "cartId", "menuItemId", "addedAt";
