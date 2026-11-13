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
const dataDir = path.join(__dirname, '.content-cache', 'data')

function rebuildContent() {
  try {
    fs.mkdirSync(path.dirname(outputJson), { recursive: true })
    execSync('node scripts/build-content.js', { stdio: 'inherit' })
  } catch (e) {
    console.error('[build-content] 构建失败:', e.message)
  }
}

// 逐文件递归复制（Windows 上 fs.cpSync 在部分磁盘/Node 版本会异常退出）
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name)
    const d = path.join(dest, entry.name)
    if (entry.isDirectory()) copyDirSync(s, d)
    else if (entry.isFile()) fs.copyFileSync(s, d)
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
      // Copy articles.json + data/ (split article contents) to dist/ during production build
      closeBundle() {
        const distPath = path.join(__dirname, 'dist', 'articles.json')
        if (fs.existsSync(outputJson)) {
          fs.copyFileSync(outputJson, distPath)
        }
        if (fs.existsSync(dataDir)) {
          copyDirSync(dataDir, path.join(__dirname, 'dist', 'data'))
        }
      },
      configureServer(server) {
        // Serve articles.json + data/ ourselves (not from public/)
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
          // 按需加载的正文文件：/data/articles/<hash>.json
          if (req.url.startsWith('/data/')) {
            const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/data\//, '')
            const filePath = path.join(dataDir, rel)
            if (filePath.startsWith(dataDir) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
              res.setHeader('Content-Type', 'application/json')
              res.setHeader('Cache-Control', 'no-cache')
              res.end(fs.readFileSync(filePath, 'utf-8'))
            } else {
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
  },
  esbuild: {
    // 生产构建剥离 console 调用（保留 debugger，反调试需要）
    drop: process.env.NODE_ENV === 'production' ? ['console'] : []
  }
})
