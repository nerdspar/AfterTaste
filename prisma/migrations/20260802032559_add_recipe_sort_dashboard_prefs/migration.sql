-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dashboardSections" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "recipeSort" TEXT NOT NULL DEFAULT 'title:asc';
