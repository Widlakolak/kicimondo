import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { readBedroom } from './src/core/bedroom.ts'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'validate-bedroom',
      apply: 'build',
      buildStart() {
        const source = readFileSync(new URL('./src/game/maps/bedroom.tmj', import.meta.url), 'utf8')
        readBedroom(JSON.parse(source))
      },
    },
  ],
})
