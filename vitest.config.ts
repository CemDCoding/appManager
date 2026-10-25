import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve('src/shared'),
      '@core': resolve('src/core'),
      '@': resolve('src/renderer')
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'scripts/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/*.seed.ts', 'e2e/**'],
    coverage: {
      provider: 'v8',
      include: ['src/core/**'],
      thresholds: { 'src/core/**': { lines: 95 } }
    }
  }
})
