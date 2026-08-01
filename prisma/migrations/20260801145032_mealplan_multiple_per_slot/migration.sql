-- DropIndex
DROP INDEX "MealPlan_householdId_date_meal_key";

-- AlterTable
ALTER TABLE "MealPlan" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "MealPlan_householdId_date_meal_idx" ON "MealPlan"("householdId", "date", "meal");
