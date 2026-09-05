import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    optimizeDeps: {
      // Оптимизатор Vite 7 превращает JSON `?url` из @tldraw/assets в готовые
      // объекты. Прямая загрузка сохраняет шрифты, иконки и переводы как URL.
      exclude: ['@tldraw/assets/imports.vite']
    },
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react(), tailwindcss()]
  }
})
