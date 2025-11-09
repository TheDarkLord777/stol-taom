BEGIN;

-- Backup full table (quick snapshot)
CREATE TABLE IF NOT EXISTS myapp."CartItem_backup_before_dedupe_menuitem" AS TABLE myapp."CartItem";

-- Delete duplicates (cartId, menuItemId) keep the earliest addedAt
WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "cartId","menuItemId" ORDER BY "addedAt" ASC) AS rn
  FROM myapp."CartItem"
)
DELETE FROM myapp."CartItem" WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

COMMIT;
