-- DropForeignKey
ALTER TABLE "PartyTask" DROP CONSTRAINT "PartyTask_assigneeId_fkey";

-- AddForeignKey
ALTER TABLE "PartyTask" ADD CONSTRAINT "PartyTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "Party_Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
