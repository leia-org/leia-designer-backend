import { describe, expect, test } from 'vitest';
import experimentRoutes from '../src/routes/v1/experimentRoutes.js';

describe('experiment routes', () => {
  test('loads the route module without unresolved handlers', () => {
    expect(experimentRoutes).toBeDefined();
  });
});
