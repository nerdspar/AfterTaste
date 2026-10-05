-- CreateTable
CREATE TABLE "Party" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "date" TEXT NOT NULL,
    "serveTime" TEXT NOT NULL DEFAULT '18:00',
    "notes" TEXT NOT NULL DEFAULT '',
    "clonedFromId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Party_Guest" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dietary" TEXT,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Party_Guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartyDish" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "course" TEXT NOT NULL DEFAULT 'Mains',
    "position" INTEGER NOT NULL DEFAULT 0,
    "recipeId" TEXT,
    "name" TEXT NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "instances" INTEGER NOT NULL DEFAULT 1,
    "equipment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "broughtById" TEXT,

    CONSTRAINT "PartyDish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartyTask" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "dayOffset" INTEGER NOT NULL DEFAULT 0,
    "at" TEXT,
    "durationMin" INTEGER NOT NULL DEFAULT 0,
    "passive" BOOLEAN NOT NULL DEFAULT false,
    "resource" TEXT NOT NULL DEFAULT 'none',
    "ovenTempF" INTEGER,
    "dishId" TEXT,
    "instance" INTEGER NOT NULL DEFAULT 1,
    "assigneeId" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PartyTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartyListItem" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "list" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "parentId" TEXT,
    "quantity" TEXT,
    "category" TEXT,
    "store" TEXT,
    "dishId" TEXT,
    "edited" BOOLEAN NOT NULL DEFAULT false,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PartyListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartyNote" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'party',
    "target" TEXT,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PartyNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Party_householdId_idx" ON "Party"("householdId");

-- CreateIndex
CREATE INDEX "Party_householdId_date_idx" ON "Party"("householdId", "date");

-- CreateIndex
CREATE INDEX "Party_Guest_partyId_idx" ON "Party_Guest"("partyId");

-- CreateIndex
CREATE INDEX "PartyDish_partyId_idx" ON "PartyDish"("partyId");

-- CreateIndex
CREATE INDEX "PartyTask_partyId_idx" ON "PartyTask"("partyId");

-- CreateIndex
CREATE INDEX "PartyTask_partyId_dayOffset_idx" ON "PartyTask"("partyId", "dayOffset");

-- CreateIndex
CREATE INDEX "PartyListItem_partyId_list_idx" ON "PartyListItem"("partyId", "list");

-- CreateIndex
CREATE INDEX "PartyNote_partyId_idx" ON "PartyNote"("partyId");

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_clonedFromId_fkey" FOREIGN KEY ("clonedFromId") REFERENCES "Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Party_Guest" ADD CONSTRAINT "Party_Guest_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyDish" ADD CONSTRAINT "PartyDish_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyDish" ADD CONSTRAINT "PartyDish_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyDish" ADD CONSTRAINT "PartyDish_broughtById_fkey" FOREIGN KEY ("broughtById") REFERENCES "Party_Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyTask" ADD CONSTRAINT "PartyTask_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyTask" ADD CONSTRAINT "PartyTask_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "PartyDish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyTask" ADD CONSTRAINT "PartyTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyListItem" ADD CONSTRAINT "PartyListItem_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyListItem" ADD CONSTRAINT "PartyListItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "PartyListItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyListItem" ADD CONSTRAINT "PartyListItem_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "PartyDish"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyNote" ADD CONSTRAINT "PartyNote_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;
