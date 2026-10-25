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
    include: ['scripts/**/*.seed.ts']
  }
})
