import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import matter from 'gray-matter'
import MarkdownIt from 'markdown-it'
import mammoth from 'mammoth'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const contentDir = path.join(root, 'content')
const outputJson = path.join(root, '.content-cache', 'articles.json')
const publicFiles = path.join(root, 'public', 'files')

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
})

// Supported file extensions
const MARKDOWN_EXTS = ['.md', '.markdown']
const WORD_EXTS = ['.docx']
const OTHER_FILE_EXTS = ['.pdf', '.xlsx', '.xls', '.pptx', '.ppt', '.txt', '.csv']

function getFileDate(filePath) {
  const stat = fs.statSync(filePath)
  return stat.mtime.toISOString().split('T')[0]
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fff-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

async function processMarkdown(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { data: frontmatter, content } = matter(raw)
  const htmlContent = md.render(content)
  return {
    title: frontmatter.title || path.basename(filePath, path.extname(filePath)),
    summary: frontmatter.summary || '',
    date: getFileDate(filePath),
    content: htmlContent
  }
}

async function processDocx(filePath) {
  const buffer = fs.readFileSync(filePath)
  const result = await mammoth.convertToHtml({ buffer })
  const title = path.basename(filePath, '.docx')
  // Extract first paragraph as summary (strip HTML tags)
  const plainText = result.value.replace(/<[^>]+>/g, '')
  const summary = plainText.substring(0, 100).trim()

  return {
    title,
    summary: summary.length >= 100 ? summary + '...' : summary,
    date: getFileDate(filePath),
    content: result.value
  }
}

async function buildArticles() {
  // Ensure output directories exist
  fs.mkdirSync(path.dirname(outputJson), { recursive: true })
  fs.mkdirSync(publicFiles, { recursive: true })

  // Ensure content directory exists
  if (!fs.existsSync(contentDir)) {
    // No content/ dir (e.g. CI environment) — use existing articles.json if available
    if (fs.existsSync(outputJson)) {
      console.log('[build-content] content/ 不存在，使用已有的 articles.json')
      return
    }
    fs.mkdirSync(contentDir, { recursive: true })
    fs.writeFileSync(outputJson, JSON.stringify({ allTags: [], articles: [] }))
    console.log('[build-content] content/ 目录为空，请创建分类文件夹并放入文档。')
    return
  }

  const articles = []
  let filesCopied = 0

  // Scan top-level directories in content/ — each folder is a tag
  const entries = fs.readdirSync(contentDir, { withFileTypes: true })
  const tagFolders = entries.filter(e => e.isDirectory())

  if (tagFolders.length === 0) {
    fs.writeFileSync(outputJson, '[]')
    console.log('[build-content] content/ 下没有分类文件夹。请创建文件夹（如 content/工作/）并放入 .docx 或 .md 文件。')
    return
  }

  for (const folder of tagFolders) {
    const tag = folder.name
    const folderPath = path.join(contentDir, tag)
    const files = fs.readdirSync(folderPath)

    for (const file of files) {
      const filePath = path.join(folderPath, file)
      const ext = path.extname(file).toLowerCase()
      const baseName = path.basename(file, ext)

      // Skip directories inside tag folders
      if (fs.statSync(filePath).isDirectory()) continue

      // Process Markdown files
      if (MARKDOWN_EXTS.includes(ext)) {
        try {
          const result = await processMarkdown(filePath)
          const slug = slugify(tag + '-' + baseName) || baseName
          articles.push({
            slug,
            title: result.title,
            tags: [tag],
            date: result.date,
            summary: result.summary,
            files: [],
            content: Buffer.from(result.content).toString('base64')
          })
        } catch (err) {
          console.error(`[build-content] 处理 ${file} 失败:`, err.message)
        }
      }

      // Process Word files
      else if (WORD_EXTS.includes(ext)) {
        try {
          const result = await processDocx(filePath)
          const slug = slugify(tag + '-' + baseName) || baseName
          articles.push({
            slug,
            title: result.title,
            tags: [tag],
            date: result.date,
            summary: result.summary,
            files: [],
            content: Buffer.from(result.content).toString('base64')
          })
        } catch (err) {
          console.error(`[build-content] 处理 ${file} 失败:`, err.message)
        }
      }

      // Copy other files (PDF, Excel, etc.) to public/files for preview/download
      else if (OTHER_FILE_EXTS.includes(ext)) {
        fs.copyFileSync(filePath, path.join(publicFiles, file))
        filesCopied++

        // Create an entry that links to the file
        const slug = slugify(tag + '-' + baseName) || baseName
        articles.push({
          slug,
          title: baseName,
          tags: [tag],
          date: getFileDate(filePath),
          summary: `${ext.replace('.', '').toUpperCase()} 文件`,
          files: [file],
          content: Buffer.from(`<p>此文档为 ${ext.replace('.', '').toUpperCase()} 文件，请点击下方附件查看。</p>`).toString('base64')
        })
      }
    }
  }

  // Sort by date descending
  articles.sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  // Collect all tag names (including empty folders)
  const allTags = tagFolders.map(f => f.name)

  const output = { allTags, articles }
  fs.writeFileSync(outputJson, JSON.stringify(output, null, 2))
  console.log(`[build-content] ✅ 构建完成：${articles.length} 篇文档，${tagFolders.length} 个分类`)
  if (filesCopied > 0) {
    console.log(`[build-content] 📎 复制了 ${filesCopied} 个附件文件到 public/files/`)
  }
}

buildArticles()
