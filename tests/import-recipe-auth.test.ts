import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The routes reach Auth.js and Prisma through these modules; stub both so a
// test decides who (if anyone) is signed in.
const authMock = vi.fn();
const findUniqueMock = vi.fn();
vi.mock('@/auth', () => ({ auth: () => authMock() }));
vi.mock('@/lib/db', () => ({
  prisma: { user: { findUnique: (...args: unknown[]) => findUniqueMock(...args) } },
}));

const { POST: importUrl } = await import('@/app/api/import-recipe/route');
const { POST: importPdf } = await import('@/app/api/import-recipe/pdf/route');
const { POST: importDocx } = await import('@/app/api/import-recipe/docx/route');

function signedOut() {
  authMock.mockResolvedValue(null);
}

function signedIn() {
  authMock.mockResolvedValue({ user: { id: 'u1' } });
  findUniqueMock.mockResolvedValue({
    householdId: 'h1',
    email: 'a@example.com',
    displayName: 'A',
  });
}

function jsonPost(body: unknown) {
  return new Request('http://localhost/api/import-recipe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function filePost(path: string) {
  const form = new FormData();
  form.set('file', new File(['not really a file'], 'x.bin'));
  return new Request(`http://localhost${path}`, { method: 'POST', body: form });
}

const fetchMock = vi.fn();

beforeEach(() => {
  authMock.mockReset();
  findUniqueMock.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('import routes require a session', () => {
  it('URL import answers 401 JSON and fetches nothing when signed out', async () => {
    signedOut();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await importUrl(jsonPost({ url: 'https://example.com/r' }) as any);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: expect.any(String) });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('PDF import answers 401 JSON when signed out', async () => {
    signedOut();
    const res = await importPdf(filePost('/api/import-recipe/pdf'));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: expect.any(String) });
  });

  it('DOCX import answers 401 JSON when signed out', async () => {
    signedOut();
    const res = await importDocx(filePost('/api/import-recipe/docx'));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: expect.any(String) });
  });

  it('a session whose user has no household is still 401', async () => {
    authMock.mockResolvedValue({ user: { id: 'u1' } });
    findUniqueMock.mockResolvedValue({ householdId: null, email: 'a@example.com' });
    const res = await importPdf(filePost('/api/import-recipe/pdf'));
    expect(res.status).toBe(401);
  });
});

describe('URL import refuses private targets', () => {
  it.each([
    'http://127.0.0.1/',
    'http://localhost:3000/',
    'http://10.0.0.5/',
    'http://192.168.1.10:8080/admin',
    'http://172.16.0.1/',
    'http://169.254.169.254/latest/meta-data/',
    'http://[::1]/',
    'http://0.0.0.0/',
  ])('rejects %s without fetching it', async (url) => {
    signedIn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await importUrl(jsonPost({ url }) as any);
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not follow a redirect into the LAN', async () => {
    signedIn();
    // Behave like real fetch: follow redirects unless told 'manual'.
    const fakeFetch = async (input: string | URL, init?: RequestInit): Promise<Response> => {
      const target = String(input);
      if (target.startsWith('https://93.184.215.14/')) {
        const location = 'http://192.168.1.1/secret';
        if (init?.redirect !== 'manual') return fetchMock(location, init);
        return new Response(null, { status: 302, headers: { Location: location } });
      }
      // Wayback lookups find nothing.
      return new Response('{}', { status: 200 });
    };
    fetchMock.mockImplementation(fakeFetch);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await importUrl(jsonPost({ url: 'https://93.184.215.14/recipe' }) as any);
    const fetched = fetchMock.mock.calls.map(([u]) => String(u));
    expect(fetched.some((u) => u.includes('192.168.1.1'))).toBe(false);
  });
});
