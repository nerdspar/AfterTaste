#!/usr/bin/env node
// Seed Friendsgiving 2026 from the Apple note it replaces.
//
// A straight transcription: every dish, every line of the run of show, every
// chore and every shopping item, with last year's lessons attached as notes.
// Nothing here is invented — where the note was ambiguous the ambiguity is
// preserved (a "?" dish becomes a maybe, an unowned dish keeps no owner)
// rather than resolved, because guessing would quietly put words in the
// cook's mouth.
//
// Usage, from anywhere the database is reachable:
//
//   DATABASE_URL=postgresql://… node scripts/seed-friendsgiving-2026.mjs
//
// Optional:
//   HOUSEHOLD_ID=…   pick the household explicitly
//   OWNER_EMAIL=…    find the household by its user (default below)
//   REPLACE=1        delete an existing Friendsgiving 2026 first
//
// Safe to run twice: without REPLACE it refuses rather than making a second
// copy, since a duplicated party is worse than no party.

import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

// Load .env only when DATABASE_URL was not supplied — so pointing this at
// production is always deliberate and never a leftover from a shell.
if (!process.env.DATABASE_URL) {
  try {
    for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["'](.*)["']$/, '$1');
      }
    }
  } catch {
    // No .env: DATABASE_URL must come from the environment.
  }
}

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

const TITLE = 'Friendsgiving 2026';
const DATE = '2026-11-21'; // the Saturday
const SERVE = '17:30'; // "adjust run of show for 530pm dinner"

// --- the note ---------------------------------------------------------------

/** "Notes for this year from last year" — they arrive unapplied, as prompts. */
const LESSONS = [
  { text: 'Adjust run of show for 5:30pm dinner', scope: 'party' },
  { text: 'No salad', scope: 'party' },
  { text: '1x recipe corn crème brûlée (people liked but tbd on making again)', scope: 'dish', dish: 'Corn crème brûlée' },
  { text: '1x recipe stuffing (smaller cubes, more liquid, broil?)', scope: 'dish', dish: 'Sourdough stuffing' },
  { text: '1x recipe gravy', scope: 'dish', dish: 'Gravy' },
  { text: 'We made too much butter (1 stick is probably plenty)', scope: 'ingredient', target: 'butter' },
  { text: 'Dates are a hit', scope: 'dish', dish: 'Bacon wrapped dates' },
  { text: 'People loved chicken & waffles', scope: 'dish', dish: 'Chicken & waffles' },
  { text: 'We need more serving utensils', scope: 'party' },
  { text: 'Bread on table (focaccia/sourdough w/ butter & oil dip) huge hit', scope: 'party' },
];

const GUESTS = [
  { name: 'Mike' },
  { name: 'Megan' },
];

// multiplier / instances / status come from how the note writes each line:
// "(2x)" on a turkey is two birds, "(1.5x recipe)" is one bigger batch, a
// leading "?" is a maybe, and "Veggie 1" is a placeholder.
const DISHES = [
  { course: 'Apps', name: 'Bacon wrapped dates' },
  { course: 'Apps', name: 'Chicken & waffles' },
  { course: 'Apps', name: 'Charcuterie' },

  { course: 'Mains', name: 'Turkey', instances: 2 },
  { course: 'Mains', name: 'Sourdough stuffing', multiplier: 1.5 },
  { course: 'Mains', name: 'Corn crème brûlée' },
  { course: 'Mains', name: 'Focaccia', multiplier: 2.5, equipment: 'both pans' },
  { course: 'Mains', name: 'Gravy' },
  { course: 'Mains', name: 'Cranberry sauce' },
  // "Mashed potatoes - Mike/Megan?" — two names and a question mark, so it
  // stays a maybe with nobody committed and the names kept in a note.
  { course: 'Mains', name: 'Mashed potatoes', status: 'maybe', note: 'Mike/Megan?' },
  { course: 'Mains', name: 'Roasted squash', status: 'maybe' },
  { course: 'Mains', name: 'Roasted sweet potatoes', status: 'maybe' },
  { course: 'Mains', name: 'Veggie 1', status: 'idea' },
  { course: 'Mains', name: 'Veggie 2', status: 'idea' },
  { course: 'Mains', name: 'Veggie 3', status: 'idea' },
];

/** Friday — the note gives no times, so these arrive unscheduled. */
const FRIDAY = [
  { label: 'Make waffles', dish: 'Chicken & waffles' },
  { label: 'Prep stuffing', dish: 'Sourdough stuffing' },
  { label: 'Bake sourdough' },
  { label: 'Check turkeys', dish: 'Turkey' },
  { label: 'Prep dates', dish: 'Bacon wrapped dates' },
  { label: 'Make herb butter' },
  { label: 'Make focaccia dough', dish: 'Focaccia' },
  { label: 'Make gravy', dish: 'Gravy' },
];

// Saturday. Durations are left at zero on purpose: the note gives times, not
// lengths, and inventing "the turkey takes four hours" would put a number in
// the oven chart that nobody chose.
const SATURDAY = [
  { at: '07:00', label: 'Prep turkey 1', dish: 'Turkey', instance: 1 },
  { at: '08:00', label: 'Turkey 1 in oven', dish: 'Turkey', instance: 1, resource: 'oven' },
  { at: '09:00', label: 'Make cocktail' },
  { at: '11:30', label: 'Prep turkey 2', dish: 'Turkey', instance: 2 },
  { at: '12:00', label: 'Turkey 2 in oven', dish: 'Turkey', instance: 2, resource: 'oven' },
  { at: '14:00', label: 'Slice sourdough — baskets on table' },
  { at: '14:30', label: 'Focaccia out of fridge', dish: 'Focaccia', passive: true },
  { at: '15:00', label: 'Make corn', dish: 'Corn crème brûlée', resource: 'burner' },
  { at: '15:00', label: 'Make coffee' },
  { at: '16:00', label: 'Apps in oven', resource: 'oven' },
  { at: '16:00', label: 'Set up sternos' },
  { at: '16:00', label: 'Carve turkey 1', dish: 'Turkey', instance: 1 },
  { at: '16:30', label: 'Focaccia in oven', dish: 'Focaccia', resource: 'oven' },
  { at: '17:00', label: 'Stuffing in oven', dish: 'Sourdough stuffing', resource: 'oven' },
  { at: '17:30', label: 'Warm gravy', dish: 'Gravy', resource: 'burner' },
  { at: '17:50', label: 'Brûlée corn', dish: 'Corn crème brûlée' },
  { at: '17:50', label: 'Carve turkey 2', dish: 'Turkey', instance: 2 },
];

/** Nesting is written as indentation in the note and kept here as children. */
const TODO = [
  { label: 'Clean house', children: [
    { label: 'Floors' },
    { label: 'Kitchen', children: [
      { label: 'Cabinets' },
      { label: 'Appliances' },
      { label: 'Lights' },
      { label: 'Counters' },
      { label: 'Organize fridge' },
    ] },
    { label: 'Bathrooms' },
    { label: 'Vacuum' },
  ] },
  { label: 'Set up tables' },
  { label: 'Clean-up outside', children: [
    { label: 'Blow leaves' },
    { label: 'Clean cushions' },
  ] },
  { label: 'House to-dos', children: [
    { label: 'Backsplash?' },
    { label: 'Vent fan?' },
    { label: 'Clean garage' },
    { label: 'Organize/decorate offices' },
  ] },
];

const PREP = [
  { label: 'Set up bar' },
  { label: 'Mini fridge beers' },
  { label: 'Set tables' },
  { label: 'Place settings' },
  { label: 'Decorations', children: [
    { label: 'Tablescape' },
    { label: '3d print pumpkins & gourds' },
    { label: 'Cricut leaves, pumpkins' },
    { label: 'Friendsgiving banners' },
  ] },
  { label: 'Plan cooking schedule' },
  { label: 'Games', children: [
    { label: 'Friendsgiving bingo' },
    { label: 'Time capsule?' },
    { label: 'Secret mission' },
    { label: 'Family feud' },
    { label: 'Jeopardy (jackbox on projector?)' },
  ] },
];

// Quantities the note did not give are left blank rather than guessed; "x2"
// and "ssss" are kept as written, because that is how the list reads in a shop.
const SHOPPING = [
  { label: 'Herbs' },
  { label: 'Butter' },
  { label: 'Turkey', quantity: 'x2' },
  { label: 'Roasting pans' },
  { label: 'Seltzer' },
  { label: 'Garlic' },
  { label: 'Shallots' },
  { label: 'Onionssss' },
  { label: 'Celery' },
  { label: 'Chicken broth' },
  { label: 'Oranges' },
  { label: 'Dried cranberries' },
  { label: 'Apple cider' },
  { label: 'Tablecloths', category: 'Supplies' },
  { label: 'Placemats', category: 'Supplies' },
  { label: 'Craft paper', category: 'Supplies' },
  { label: 'Balloons?', category: 'Supplies' },
  { label: 'Napkins', category: 'Supplies' },
  { label: 'Small plates', category: 'Supplies' },
  { label: 'Large plates?', category: 'Supplies' },
  { label: 'Cutlery?', category: 'Supplies' },
  { label: 'Leftover containers?', category: 'Supplies' },
  { label: 'Game buzzer?', category: 'Supplies' },
  { label: 'Game prizes', category: 'Supplies', children: [{ label: 'Turkey hat?' }] },
];

// --- writing ----------------------------------------------------------------

async function resolveHousehold() {
  if (process.env.HOUSEHOLD_ID) return process.env.HOUSEHOLD_ID;

  const email = process.env.OWNER_EMAIL ?? 'scogoldberg@gmail.com';
  const user = await prisma.user.findFirst({
    where: { email },
    select: { householdId: true },
  });
  if (user?.householdId) return user.householdId;

  const households = await prisma.household.findMany({ select: { id: true, name: true } });
  if (households.length === 1) return households[0].id;
  throw new Error(
    `Could not pick a household (found ${households.length}). ` +
      'Set HOUSEHOLD_ID or OWNER_EMAIL.',
  );
}

/** Write a nested list depth-first, keeping the note's order. */
async function writeList(partyId, list, nodes, startAt = 0) {
  let position = startAt;
  const walk = async (items, parentId) => {
    for (const item of items) {
      const row = await prisma.partyListItem.create({
        data: {
          partyId,
          list,
          label: item.label,
          parentId,
          quantity: item.quantity ?? null,
          category: item.category ?? null,
          // Everything here was written by a person, so a later "pull from the
          // menu" must leave it alone.
          edited: true,
          position: position++,
        },
      });
      if (item.children) await walk(item.children, row.id);
    }
  };
  await walk(nodes, null);
  return position;
}

async function main() {
  const householdId = await resolveHousehold();

  const existing = await prisma.party.findFirst({
    where: { householdId, title: TITLE },
    select: { id: true },
  });
  if (existing) {
    if (process.env.REPLACE !== '1') {
      console.error(
        `"${TITLE}" already exists (${existing.id}). ` +
          'Re-run with REPLACE=1 to delete and rewrite it.',
      );
      process.exitCode = 1;
      return;
    }
    await prisma.party.delete({ where: { id: existing.id } });
    console.log(`removed the existing ${TITLE}`);
  }

  const party = await prisma.party.create({
    data: {
      id: randomUUID(),
      householdId,
      title: TITLE,
      subtitle: 'The year we…',
      date: DATE,
      serveTime: SERVE,
    },
  });

  const guests = new Map();
  for (const g of GUESTS) {
    const row = await prisma.party_Guest.create({
      data: { partyId: party.id, name: g.name },
    });
    guests.set(g.name, row.id);
  }

  const dishes = new Map();
  let dishPos = 0;
  for (const d of DISHES) {
    const row = await prisma.partyDish.create({
      data: {
        partyId: party.id,
        course: d.course,
        name: d.name,
        multiplier: d.multiplier ?? 1,
        instances: d.instances ?? 1,
        equipment: d.equipment ?? null,
        status: d.status ?? 'confirmed',
        position: dishPos++,
      },
    });
    dishes.set(d.name, row.id);
    if (d.note) {
      await prisma.partyNote.create({
        data: {
          partyId: party.id,
          text: d.note,
          scope: 'dish',
          target: row.id,
          position: 100 + dishPos,
        },
      });
    }
  }

  let taskPos = 0;
  for (const t of FRIDAY) {
    await prisma.partyTask.create({
      data: {
        partyId: party.id,
        label: t.label,
        dayOffset: -1,
        at: null,
        dishId: t.dish ? (dishes.get(t.dish) ?? null) : null,
        position: taskPos++,
      },
    });
  }
  for (const t of SATURDAY) {
    await prisma.partyTask.create({
      data: {
        partyId: party.id,
        label: t.label,
        dayOffset: 0,
        at: t.at,
        durationMin: 0,
        passive: t.passive ?? false,
        resource: t.resource ?? 'none',
        dishId: t.dish ? (dishes.get(t.dish) ?? null) : null,
        instance: t.instance ?? 1,
        position: taskPos++,
      },
    });
  }

  await writeList(party.id, 'todo', TODO);
  await writeList(party.id, 'prep', PREP);
  await writeList(party.id, 'shopping', SHOPPING);

  let notePos = 0;
  for (const n of LESSONS) {
    await prisma.partyNote.create({
      data: {
        partyId: party.id,
        text: n.text,
        scope: n.scope,
        target:
          n.scope === 'dish' ? (dishes.get(n.dish) ?? null) : (n.target ?? null),
        applied: false,
        position: notePos++,
      },
    });
  }

  const counts = await prisma.party.findUniqueOrThrow({
    where: { id: party.id },
    include: {
      _count: { select: { dishes: true, guests: true, tasks: true, items: true, partyNotes: true } },
    },
  });
  console.log(`seeded ${TITLE} (${party.id})`);
  console.log(
    `  ${counts._count.dishes} dishes, ${counts._count.guests} guests, ` +
      `${counts._count.tasks} tasks, ${counts._count.items} list items, ` +
      `${counts._count.partyNotes} notes`,
  );
}

main()
  .catch((err) => {
    console.error(err.message ?? err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
