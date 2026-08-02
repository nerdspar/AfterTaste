-- AlterTable
ALTER TABLE "User" ADD COLUMN     "clipboardDetect" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "keepAwake" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "nutritionEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tabConfig" TEXT[] DEFAULT ARRAY[]::TEXT[];
