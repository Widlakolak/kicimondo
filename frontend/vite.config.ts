import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { validateContent } from './src/content/validate.ts'
import { loadMaps } from './src/content/loadMaps.ts'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'validate-world-content',
      apply: 'build',
      buildStart() {
        validateContent(loadMaps((id) => readFileSync(new URL(`./src/game/maps/${id}.tmj`, import.meta.url), 'utf8')))
      },
    },
  ],
})
