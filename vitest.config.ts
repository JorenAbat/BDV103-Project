import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    includeSource: ['src/**/*.{js,ts}'],  // Enable in-source testing for all JS/TS files in src
    globals: true,                         // Enable global test functions
    environment: 'node',                   // Use Node.js environment
    setupFiles: ['./src/test/setup.ts'],
  },
  define: {
    'import.meta.vitest': 'undefined',     // Remove test code from production builds
  },
}) 