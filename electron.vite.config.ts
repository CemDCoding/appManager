import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const shared = resolve('src/shared')
const core = resolve('src/core')

export default defineConfig({
  main: {
    resolve: { alias: { '@shared': shared, '@core': core } }
  },
  preload: {
    resolve: { alias: { '@shared': shared } }
  },
  renderer: {
    resolve: {
      alias: { '@': resolve('src/renderer'), '@shared': shared, '@core': core }
    },
    plugins: [react(), tailwindcss()]
  }
})
