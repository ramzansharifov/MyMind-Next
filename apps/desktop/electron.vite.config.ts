import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const bundledWorkspacePackages = ['@mymind/contracts', '@mymind/core', '@mymind/persistence']

const desktopPackage = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8')
) as { version: string }

export default defineConfig({
  main: {
    build: {
      externalizeDeps: {
        exclude: bundledWorkspacePackages
      }
    }
  },
  preload: {
    build: {
      externalizeDeps: {
        exclude: bundledWorkspacePackages
      }
    }
  },
  renderer: {
    define: {
      __APP_VERSION__: JSON.stringify(desktopPackage.version)
    },
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
