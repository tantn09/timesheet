ALTER TABLE "users" ADD COLUMN "username" TEXT;

WITH normalized AS (
    SELECT
        "id",
        NULLIF(regexp_replace(lower(split_part("email", '@', 1)), '[^a-z0-9._-]', '', 'g'), '') AS candidate
    FROM "users"
), duplicates AS (
    SELECT candidate
    FROM normalized
    WHERE candidate IS NOT NULL
    GROUP BY candidate
    HAVING COUNT(*) > 1
)
UPDATE "users" AS u
SET "username" = CASE
    WHEN n.candidate IS NULL THEN 'user_' || u."id"
    WHEN d.candidate IS NOT NULL THEN n.candidate || '_' || u."id"
    ELSE n.candidate
END
FROM normalized AS n
LEFT JOIN duplicates AS d ON d.candidate = n.candidate
WHERE u."id" = n."id";

ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
