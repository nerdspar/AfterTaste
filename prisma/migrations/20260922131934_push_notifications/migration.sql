-- AlterTable
ALTER TABLE "User" ADD COLUMN     "cookNudgeAfterMin" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "cookNudgeDelayHr" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "pushCookNudge" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pushNewRecipes" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "quietFromHour" INTEGER NOT NULL DEFAULT 21,
ADD COLUMN     "quietToHour" INTEGER NOT NULL DEFAULT 8,
ADD COLUMN     "timeZone" TEXT;

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSentAt" TIMESTAMP(3),

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "skippedAt" TIMESTAMP(3),
    "skippedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduledNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE INDEX "ScheduledNotification_dueAt_sentAt_idx" ON "ScheduledNotification"("dueAt", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledNotification_userId_kind_recipeId_key" ON "ScheduledNotification"("userId", "kind", "recipeId");

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledNotification" ADD CONSTRAINT "ScheduledNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
