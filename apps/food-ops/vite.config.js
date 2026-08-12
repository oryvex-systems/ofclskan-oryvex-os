import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.FOOD_OPS_BASE_PATH || '/',
  build: { outDir: 'dist', emptyOutDir: true },
})
