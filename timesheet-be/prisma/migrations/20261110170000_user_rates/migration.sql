ALTER TABLE "project_user_rates" DROP CONSTRAINT "project_user_rates_project_id_fkey";
DROP INDEX "project_user_rates_project_id_user_id_effective_from_idx";
ALTER TABLE "project_user_rates" DROP COLUMN "project_id";
ALTER TABLE "project_user_rates" RENAME TO "user_rates";
CREATE INDEX "user_rates_user_id_effective_from_idx" ON "user_rates"("user_id", "effective_from");
