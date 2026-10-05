-- AlterTable
ALTER TABLE "PartyListItem" ADD COLUMN     "taskId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PartyListItem_taskId_key" ON "PartyListItem"("taskId");

-- AddForeignKey
ALTER TABLE "PartyListItem" ADD CONSTRAINT "PartyListItem_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "PartyTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

