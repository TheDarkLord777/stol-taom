BEGIN;

-- Backup full table (quick snapshot)
CREATE TABLE IF NOT EXISTS myapp."CartItem_backup_before_dedupe" AS TABLE myapp."CartItem";

-- Delete duplicates but keep the earliest (smallest addedAt)
WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "cartId","clientItemId" ORDER BY "addedAt" ASC) AS rn
  FROM myapp."CartItem"
  WHERE "clientItemId" IS NOT NULL
)
DELETE FROM myapp."CartItem" WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

COMMIT;
