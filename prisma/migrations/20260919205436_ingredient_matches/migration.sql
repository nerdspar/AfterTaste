-- CreateTable
CREATE TABLE "IngredientMatch" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "foodName" TEXT NOT NULL,
    "brand" TEXT,
    "source" TEXT NOT NULL,
    "calories" INTEGER NOT NULL,
    "proteinG" INTEGER,
    "carbsG" INTEGER,
    "fatG" INTEGER,
    "fiberG" INTEGER,
    "sugarG" INTEGER,
    "sodiumMg" INTEGER,
    "servingSizeG" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngredientMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IngredientMatch_householdId_idx" ON "IngredientMatch"("householdId");

-- CreateIndex
CREATE UNIQUE INDEX "IngredientMatch_householdId_term_key" ON "IngredientMatch"("householdId", "term");

-- AddForeignKey
ALTER TABLE "IngredientMatch" ADD CONSTRAINT "IngredientMatch_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
