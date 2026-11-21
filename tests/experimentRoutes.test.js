import { describe, expect, test } from 'vitest';
import experimentRoutes from '../src/routes/v1/experimentRoutes.js';
import { requireAdmin, requireJwtAuthentication } from '../src/middlewares/auth.js';

describe('experiment routes', () => {
  test('requires an administrator before publishing', () => {
    const route = experimentRoutes.stack.find((layer) => layer.route?.path === '/:id/publish').route;
    expect(route.stack.slice(0, 2).map((layer) => layer.handle)).toEqual([
      requireJwtAuthentication, requireAdmin,
    ]);
    for (const role of ['instructor', 'advanced', 'read', undefined]) {
      requireAdmin({ auth: { payload: { role } } }, {}, (error) => {
        expect(error?.statusCode).toBe(403);
      });
    }
    requireAdmin({ auth: { payload: { role: 'admin' } } }, {}, (error) => {
      expect(error).toBeUndefined();
    });
  });
  test('loads the route module without unresolved handlers', () => {
    expect(experimentRoutes).toBeDefined();
  });
});
