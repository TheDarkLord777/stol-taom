SELECT 'CartItem' AS table_name, COUNT(*) AS cnt FROM myapp."CartItem";
SELECT 'CartItem_backup' AS table_name, COUNT(*) AS cnt FROM myapp."CartItem_backup_before_dedupe_menuitem";
SELECT 'Cart' AS table_name, COUNT(*) AS cnt FROM myapp."Cart";
SELECT 'MenuItem' AS table_name, COUNT(*) AS cnt FROM myapp."MenuItem";
SELECT 'User' AS table_name, COUNT(*) AS cnt FROM myapp."User";

-- show a few sample rows from the backup table
SELECT * FROM myapp."CartItem_backup_before_dedupe_menuitem" ORDER BY "cartId" LIMIT 5;
