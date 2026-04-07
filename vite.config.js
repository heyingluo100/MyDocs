import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const contentDir = path.join(__dirname, 'content')
const outputJson = path.join(__dirname, '.content-cache', 'articles.json')

function rebuildContent() {
  try {
    fs.mkdirSync(path.dirname(outputJson), { recursive: true })
    execSync('node scripts/build-content.js', { stdio: 'inherit' })
  } catch (e) {
    console.error('[build-content] 构建失败:', e.message)
  }
}

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    {
      name: 'build-content',
      buildStart() {
        rebuildContent()
      },
      // Copy articles.json to dist/ during production build
      closeBundle() {
        const distPath = path.join(__dirname, 'dist', 'articles.json')
        if (fs.existsSync(outputJson)) {
          fs.copyFileSync(outputJson, distPath)
        }
      },
      configureServer(server) {
        // Serve articles.json ourselves (not from public/)
        server.middlewares.use((req, res, next) => {
          if (req.url === '/articles.json') {
            try {
              const data = fs.readFileSync(outputJson, 'utf-8')
              res.setHeader('Content-Type', 'application/json')
              res.setHeader('Cache-Control', 'no-cache')
              res.end(data)
            } catch {
              res.statusCode = 404
              res.end('{}')
            }
            return
          }
          next()
        })

        // Ignore content/ and .content-cache/ in Vite's own watcher
        // to prevent Vite from triggering full-reload
        server.watcher.add([]) // ensure watcher exists
        const origEmit = server.watcher.emit.bind(server.watcher)
        server.watcher.emit = function (event, filePath, ...args) {
          if (typeof filePath === 'string') {
            const normalized = filePath.replace(/\\/g, '/')
            if (normalized.includes('/content/') || normalized.includes('/.content-cache/') || normalized.includes('/articles.json')) {
              return this // Swallow the event, prevent Vite from reacting
            }
          }
          return origEmit(event, filePath, ...args)
        }

        // Our own watcher for content/ directory
        let debounceTimer = null
        const watcher = fs.watch(contentDir, { recursive: true }, (event, filename) => {
          // Skip Word temp files
          if (filename && /~\$|\.tmp$/i.test(filename)) return

          clearTimeout(debounceTimer)
          debounceTimer = setTimeout(() => {
            console.log(`[build-content] 检测到变化: ${filename}，重新构建...`)
            rebuildContent()
            try {
              const newData = JSON.parse(fs.readFileSync(outputJson, 'utf-8'))
              server.ws.send({
                type: 'custom',
                event: 'content-update',
                data: newData
              })
              console.log(`[build-content] ✅ 已推送更新到浏览器（无刷新）`)
            } catch (e) {
              console.error('[build-content] 推送失败:', e.message)
            }
          }, 1500)
        })

        server.httpServer?.on('close', () => {
          watcher.close()
        })
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
