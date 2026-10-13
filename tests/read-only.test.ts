import { describe, expect, it } from 'vitest';
import { isReadOnly, refusedWhenReadOnly } from '@/lib/read-only';

const action = new Headers({ 'Next-Action': 'abc123' });
const none = new Headers();

describe('read-only mode', () => {
  it('is on only when READ_ONLY says so', () => {
    expect(isReadOnly({})).toBe(false);
    expect(isReadOnly({ READ_ONLY: '' })).toBe(false);
    expect(isReadOnly({ READ_ONLY: '0' })).toBe(false);
    expect(isReadOnly({ READ_ONLY: 'false' })).toBe(false);
    expect(isReadOnly({ READ_ONLY: '1' })).toBe(true);
    expect(isReadOnly({ READ_ONLY: ' TRUE ' })).toBe(true);
  });

  it('lets every read through', () => {
    for (const path of ['/dashboard', '/recipes/x', '/api/export', '/api/uploads/a.jpg', '/api/events']) {
      expect(refusedWhenReadOnly('GET', path, none)).toBe(false);
      expect(refusedWhenReadOnly('HEAD', path, none)).toBe(false);
    }
  });

  it('refuses server actions everywhere but signing in', () => {
    expect(refusedWhenReadOnly('POST', '/recipes/x', action)).toBe(true);
    expect(refusedWhenReadOnly('POST', '/grocery-list', action)).toBe(true);
    expect(refusedWhenReadOnly('POST', '/parties/abc', action)).toBe(true);
    expect(refusedWhenReadOnly('POST', '/signup', action)).toBe(true);
    expect(refusedWhenReadOnly('POST', '/reset-password', action)).toBe(true);
    expect(refusedWhenReadOnly('POST', '/login', action)).toBe(false);
  });

  it('keeps signing in (the native import uses it) and parsing a recipe link', () => {
    expect(refusedWhenReadOnly('POST', '/api/auth/callback/credentials', none)).toBe(false);
    expect(refusedWhenReadOnly('POST', '/api/import-recipe', none)).toBe(false);
  });

  it('refuses any other write', () => {
    expect(refusedWhenReadOnly('POST', '/dashboard', none)).toBe(true);
    expect(refusedWhenReadOnly('DELETE', '/api/anything', none)).toBe(true);
    expect(refusedWhenReadOnly('PUT', '/settings', none)).toBe(true);
  });
});
