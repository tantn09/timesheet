ALTER TABLE "users" ADD COLUMN "hourly_rate_gbp" DECIMAL(12,2);
UPDATE "users" u SET "hourly_rate_gbp" = r."hourly_rate_gbp"
FROM (SELECT DISTINCT ON ("user_id") "user_id", "hourly_rate_gbp" FROM "user_rates" ORDER BY "user_id", "effective_from" DESC) r
WHERE u.id = r."user_id";
DROP TABLE "user_rates";
