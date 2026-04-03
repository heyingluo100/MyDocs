import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'child_process'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    {
      name: 'build-content',
      buildStart() {
        execSync('node scripts/build-content.js', { stdio: 'inherit' })
      }
    }
  ],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  }
})
