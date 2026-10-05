-- AlterTable
ALTER TABLE "PartyTask" ADD COLUMN     "alertedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "partyAlertLeadMin" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "pushPartySteps" BOOLEAN NOT NULL DEFAULT true;

