import { defineConfig } from 'vite'

const basePath = process.env.TIKLADOY_BASE_PATH || '/'

export default defineConfig({
  base: basePath,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
