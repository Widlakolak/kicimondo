import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { validateContent } from './src/content/validate.ts'
import { loadMaps } from './src/content/loadMaps.ts'
import { pwa } from './pwa.config.ts'

export default defineConfig(({ mode }) => ({
  base: './',
  build: {
    target: 'chrome80',
    cssTarget: 'chrome80',
    outDir: mode === 'android' ? 'dist-android' : 'dist',
  },
  plugins: [
    react(),
    ...(mode === 'android' ? [] : [pwa()]),
    {
      name: 'validate-world-content',
      apply: 'build',
      buildStart() {
        validateContent(loadMaps((id) => readFileSync(new URL(`./src/game/maps/${id}.tmj`, import.meta.url), 'utf8')))
      },
    },
  ],
}))
