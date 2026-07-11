import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/e2e/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    testTimeout: 60000,
  },
});
