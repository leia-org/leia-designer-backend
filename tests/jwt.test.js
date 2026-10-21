import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import jwt from 'jsonwebtoken';
import { verifyToken } from '../src/utils/jwt.js';

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env.JWT_SECRET = 'test-secret';
  process.env.JWT_ISSUER = 'https://pre.auth.leia.ovh';
  process.env.JWT_AUDIENCE = 'leia-platform';
});

afterEach(() => {
  process.env = { ...originalEnv };
});

const sign = (payload, options = {}) => jwt.sign(payload, process.env.JWT_SECRET, {
  issuer: process.env.JWT_ISSUER,
  audience: process.env.JWT_AUDIENCE,
  expiresIn: '15m',
  ...options,
});

describe('Auth access JWT verification', () => {
  test('accepts an access token from the configured Auth environment', () => {
    expect(verifyToken(sign({ id: 'user-1', role: 'admin', type: 'access' }))).toMatchObject({
      id: 'user-1',
      role: 'admin',
      type: 'access',
    });
  });

  test('keeps accepting issuer-bound legacy tokens during rollout', () => {
    expect(verifyToken(sign({ id: 'user-1', role: 'admin' }))).toMatchObject({ id: 'user-1' });
  });

  test('rejects session tokens and tokens issued for another environment', () => {
    expect(() => verifyToken(sign({ id: 'user-1', type: 'session' }))).toThrow('Access token required');
    const productionToken = sign(
      { id: 'user-1', type: 'access' },
      { issuer: 'https://auth.leia.ovh' },
    );
    expect(() => verifyToken(productionToken)).toThrow();
  });
});
