import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.js'],
    environment: 'node',
    fileParallelism: false,
    hookTimeout: 15000,
    testTimeout: 10000,
  },
});
