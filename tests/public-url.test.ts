import { describe, expect, it } from 'vitest';
import { isPrivateAddress } from '@/lib/public-url';

describe('isPrivateAddress', () => {
  it.each([
    '127.0.0.1',
    '127.255.0.9',
    '10.1.2.3',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.0.1',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '255.255.255.255',
    '224.0.0.1',
    '::',
    '::1',
    'fe80::1',
    'fc00::1',
    'fd12:3456::1',
    '::ffff:127.0.0.1',
    '::ffff:192.168.1.1',
  ])('%s is private', (ip) => {
    expect(isPrivateAddress(ip)).toBe(true);
  });

  it.each(['93.184.215.14', '8.8.8.8', '172.32.0.1', '2606:4700::1111', '::ffff:8.8.8.8'])(
    '%s is public',
    (ip) => {
      expect(isPrivateAddress(ip)).toBe(false);
    },
  );
});
