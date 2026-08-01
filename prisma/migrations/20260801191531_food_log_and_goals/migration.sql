-- AlterTable
ALTER TABLE "User" ADD COLUMN     "calorieGoal" INTEGER,
ADD COLUMN     "carbsGoalG" INTEGER,
ADD COLUMN     "fatGoalG" INTEGER,
ADD COLUMN     "proteinGoalG" INTEGER;

-- CreateTable
CREATE TABLE "FoodLogEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "meal" TEXT NOT NULL,
    "recipeId" TEXT,
    "name" TEXT NOT NULL,
    "servings" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "calories" INTEGER NOT NULL DEFAULT 0,
    "proteinG" INTEGER,
    "carbsG" INTEGER,
    "fatG" INTEGER,
    "fiberG" INTEGER,
    "sugarG" INTEGER,
    "sodiumMg" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FoodLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FoodLogEntry_userId_date_idx" ON "FoodLogEntry"("userId", "date");

-- AddForeignKey
ALTER TABLE "FoodLogEntry" ADD CONSTRAINT "FoodLogEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodLogEntry" ADD CONSTRAINT "FoodLogEntry_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
