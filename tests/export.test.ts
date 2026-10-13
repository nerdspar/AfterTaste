import { beforeEach, describe, expect, it, vi } from 'vitest';

// The route reaches Auth.js and Prisma through these modules; stub both so a
// test decides who is signed in and what the database holds.
const authMock = vi.fn();
const db = {
  user: { findUnique: vi.fn() },
  household: { findUnique: vi.fn() },
  recipe: { findMany: vi.fn() },
  groceryItem: { findMany: vi.fn() },
  mealPlan: { findMany: vi.fn() },
  ingredientMatch: { findMany: vi.fn() },
  party: { findMany: vi.fn() },
  foodLogEntry: { findMany: vi.fn() },
  recentlyViewed: { findMany: vi.fn() },
};
vi.mock('@/auth', () => ({ auth: () => authMock() }));
vi.mock('@/lib/db', () => ({ prisma: db }));

const { GET } = await import('@/app/api/export/route');
const { uploadsReferenced } = await import('@/lib/uploads-referenced');

const scott = {
  id: 'u1',
  email: 'scott@aftertaste.test',
  displayName: 'Scott',
  householdId: 'h1',
  passwordHash: '$2b$10$secret',
  units: 'imperial',
  calorieGoal: 2200,
};

beforeEach(() => {
  authMock.mockReset();
  for (const model of Object.values(db)) for (const fn of Object.values(model)) fn.mockReset();
  for (const model of Object.values(db)) if ('findMany' in model) model.findMany.mockResolvedValue([]);
});

function signIn() {
  authMock.mockResolvedValue({ user: { id: 'u1' } });
  db.user.findUnique.mockResolvedValue(scott);
  db.household.findUnique.mockResolvedValue({ id: 'h1', name: 'Home', ownerId: 'u1', members: [] });
}

describe('GET /api/export', () => {
  it('refuses when signed out, with a 401 rather than a redirect', async () => {
    authMock.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(db.recipe.findMany).not.toHaveBeenCalled();
  });

  it("scopes shared data to the household and personal data to the signed-in person", async () => {
    signIn();
    await GET();
    for (const m of ['recipe', 'groceryItem', 'mealPlan', 'ingredientMatch', 'party'] as const) {
      expect(db[m].findMany.mock.calls[0][0].where).toEqual({ householdId: 'h1' });
    }
    expect(db.foodLogEntry.findMany.mock.calls[0][0].where).toEqual({ userId: 'u1' });
    expect(db.recentlyViewed.findMany.mock.calls[0][0].where).toEqual({ userId: 'u1' });
  });

  it('includes parties with every child list', async () => {
    signIn();
    await GET();
    expect(db.party.findMany.mock.calls[0][0].include).toEqual({
      guests: true, dishes: true, tasks: true, items: true, partyNotes: true,
    });
  });

  it('never sends the password hash', async () => {
    signIn();
    const body = await (await GET()).json();
    expect(body.me.email).toBe('scott@aftertaste.test');
    expect(body.me.calorieGoal).toBe(2200);
    expect(JSON.stringify(body)).not.toContain('secret');
    expect(body.me.passwordHash).toBeUndefined();
  });

  it('labels itself so the app can tell it from a recipe export', async () => {
    signIn();
    const body = await (await GET()).json();
    expect(body).toMatchObject({ app: 'AfterTaste', kind: 'native-export', version: 1 });
  });
});

describe('uploadsReferenced', () => {
  it('finds every uploaded file once, in recipe photos, step media and the avatar', () => {
    const recipes = [
      { image: '/api/uploads/abc123.jpg', instructions: [{ videoThumb: '/api/uploads/step-1.mp4' }] },
      { image: 'https://example.com/x.jpg', ingredients: [{ image: '/api/uploads/abc123.jpg' }] },
    ];
    expect(uploadsReferenced(recipes, { avatarUrl: '/api/uploads/me.png' })).toEqual([
      '/api/uploads/abc123.jpg',
      '/api/uploads/me.png',
      '/api/uploads/step-1.mp4',
    ]);
  });
});
