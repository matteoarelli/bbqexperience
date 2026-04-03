import { describe, it, expect } from 'vitest';
import { checkRateLimit, getClientIp } from './rate-limit';

describe('checkRateLimit', () => {
  it('permette richieste sotto il limite', () => {
    const ip = `test-${Date.now()}`;
    expect(checkRateLimit(ip, 'test-endpoint', 5)).toBe(true);
    expect(checkRateLimit(ip, 'test-endpoint', 5)).toBe(true);
  });

  it('blocca dopo aver superato il limite', () => {
    const ip = `blocked-${Date.now()}`;
    for (let i = 0; i < 3; i++) {
      checkRateLimit(ip, 'test-block', 3);
    }
    expect(checkRateLimit(ip, 'test-block', 3)).toBe(false);
  });

  it('endpoint diversi hanno conteggi separati', () => {
    const ip = `multi-${Date.now()}`;
    for (let i = 0; i < 3; i++) {
      checkRateLimit(ip, 'endpoint-a', 3);
    }
    expect(checkRateLimit(ip, 'endpoint-b', 3)).toBe(true);
  });
});

describe('getClientIp', () => {
  it('estrae IP da x-forwarded-for', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(getClientIp(req)).toBe('1.2.3.4');
  });

  it('fallback a x-real-ip', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-real-ip': '9.8.7.6' },
    });
    expect(getClientIp(req)).toBe('9.8.7.6');
  });

  it('fallback a unknown', () => {
    const req = new Request('http://localhost');
    expect(getClientIp(req)).toBe('unknown');
  });
});
