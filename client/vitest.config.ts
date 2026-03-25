import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      'shape-research-shared': '../shared/src/types.ts',
    },
  },
});
