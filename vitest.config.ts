import { defineConfig } from 'vitest/config'
import openApiPlugin from './vitest-openapi-plugin.js'

export default defineConfig({
  plugins: [openApiPlugin],
  test: {
    includeSource: ['src/**/*.{js,ts}'],  // Enable in-source testing for all JS/TS files in src
    globals: true,                         // Enable global test functions
    environment: 'node',                   // Use Node.js environment
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['**/node_modules/**', '**/build/**', '**/client/**']
  },
  define: {
    'import.meta.vitest': 'undefined',     // Remove test code from production builds
  },
}) 