import { describe, expect, test } from 'vitest';
import rubricRoutes from '../src/routes/v1/rubricRoutes.js';

describe('rubric routes', () => {
  test('loads the route module without unresolved handlers', () => {
    expect(rubricRoutes).toBeDefined();
  });
});
