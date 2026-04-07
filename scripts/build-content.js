import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import matter from 'gray-matter'
import MarkdownIt from 'markdown-it'
import mammoth from 'mammoth'
import WordExtractor from 'word-extractor'
import JSZip from 'jszip'

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
const DOC_EXTS = ['.doc']
const TEXT_EXTS = ['.txt']
const OTHER_FILE_EXTS = ['.pdf', '.xlsx', '.xls', '.pptx', '.ppt', '.csv']

function getFileDates(filePath) {
  const stat = fs.statSync(filePath)
  return {
    createdAt: stat.birthtime.toISOString().split('T')[0],
    updatedAt: stat.mtime.toISOString().split('T')[0]
  }
}

async function getDocxDates(filePath) {
  try {
    const buffer = fs.readFileSync(filePath)
    const zip = await JSZip.loadAsync(buffer)
    const coreXml = await zip.file('docProps/core.xml')?.async('text')
    if (!coreXml) return getFileDates(filePath)

    const createdMatch = coreXml.match(/<dcterms:created[^>]*>([^<]+)</)
    const modifiedMatch = coreXml.match(/<dcterms:modified[^>]*>([^<]+)</)

    const fsDates = getFileDates(filePath)
    return {
      createdAt: createdMatch ? createdMatch[1].split('T')[0] : fsDates.createdAt,
      updatedAt: modifiedMatch ? modifiedMatch[1].split('T')[0] : fsDates.updatedAt
    }
  } catch {
    return getFileDates(filePath)
  }
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
    ...getFileDates(filePath),
    content: htmlContent
  }
}

async function processDocx(filePath) {
  const buffer = fs.readFileSync(filePath)

  // Use transformDocument to preserve empty paragraphs
  const result = await mammoth.convertToHtml({ buffer }, {
    transformDocument: mammoth.transforms.paragraph(function(para) {
      const hasText = mammoth.transforms.getDescendantsOfType(para, 'text')
        .some(t => t.value && t.value.trim() !== '')
      if (!hasText) {
        return { ...para, children: [{ type: 'text', value: '\u200B' }] }
      }
      return para
    })
  })

  // Replace zero-width space paragraphs with visible empty lines
  const htmlContent = result.value.replace(/<p>\u200B<\/p>/g, '<p><br></p>')

  const title = path.basename(filePath, '.docx')
  const plainText = htmlContent.replace(/<[^>]+>/g, '')
  const summary = plainText.substring(0, 100).trim()
  const dates = await getDocxDates(filePath)

  return {
    title,
    summary: summary.length >= 100 ? summary + '...' : summary,
    ...dates,
    content: htmlContent
  }
}

async function processDoc(filePath) {
  const extractor = new WordExtractor()
  const doc = await extractor.extract(filePath)
  const raw = doc.getBody()
  const title = path.basename(filePath, '.doc')
  const summary = raw.substring(0, 100).trim()

  const escaped = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const htmlContent = escaped.split(/\r?\n/).map(line => {
    if (!line.trim()) return '<p><br></p>'
    return `<p>${line}</p>`
  }).join('\n')

  return {
    title,
    summary: summary.length >= 100 ? summary + '...' : summary,
    ...getFileDates(filePath),
    content: htmlContent
  }
}

function processText(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const title = path.basename(filePath, path.extname(filePath))
  const summary = raw.substring(0, 100).trim()
  // Convert plain text to HTML: escape HTML entities, preserve line breaks
  const escaped = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const htmlContent = escaped.split(/\r?\n/).map(line => {
    if (!line.trim()) return '<p><br></p>'
    return `<p>${line}</p>`
  }).join('\n')
  return {
    title,
    summary: summary.length >= 100 ? summary + '...' : summary,
    ...getFileDates(filePath),
    content: htmlContent
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

      // Skip Word temporary files (~$*.docx)
      if (file.startsWith('~$')) continue

      // Process Markdown files
      if (MARKDOWN_EXTS.includes(ext)) {
        try {
          const result = await processMarkdown(filePath)
          const slug = slugify(tag + '-' + baseName) || baseName
          articles.push({
            slug,
            title: result.title,
            tags: [tag],
            createdAt: result.createdAt,
            updatedAt: result.updatedAt,
            summary: result.summary,
            files: [],
            content: Buffer.from(result.content).toString('base64')
          })
        } catch (err) {
          console.error(`[build-content] 处理 ${file} 失败:`, err.message)
        }
      }

      // Process Word .docx files
      else if (WORD_EXTS.includes(ext)) {
        try {
          const result = await processDocx(filePath)
          const slug = slugify(tag + '-' + baseName) || baseName
          articles.push({
            slug,
            title: result.title,
            tags: [tag],
            createdAt: result.createdAt,
            updatedAt: result.updatedAt,
            summary: result.summary,
            files: [],
            content: Buffer.from(result.content).toString('base64')
          })
        } catch (err) {
          console.error(`[build-content] 处理 ${file} 失败:`, err.message)
        }
      }

      // Process Word .doc files (legacy format)
      else if (DOC_EXTS.includes(ext)) {
        try {
          const result = await processDoc(filePath)
          const slug = slugify(tag + '-' + baseName) || baseName
          articles.push({
            slug,
            title: result.title,
            tags: [tag],
            createdAt: result.createdAt,
            updatedAt: result.updatedAt,
            summary: result.summary,
            files: [],
            content: Buffer.from(result.content).toString('base64')
          })
        } catch (err) {
          console.error(`[build-content] 处理 ${file} 失败:`, err.message)
        }
      }

      // Process text files
      else if (TEXT_EXTS.includes(ext)) {
        try {
          const result = processText(filePath)
          const slug = slugify(tag + '-' + baseName) || baseName
          articles.push({
            slug,
            title: result.title,
            tags: [tag],
            createdAt: result.createdAt,
            updatedAt: result.updatedAt,
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
          ...getFileDates(filePath),
          summary: `${ext.replace('.', '').toUpperCase()} 文件`,
          files: [file],
          content: Buffer.from(`<p>此文档为 ${ext.replace('.', '').toUpperCase()} 文件，请点击下方附件查看。</p>`).toString('base64')
        })
      }
    }
  }

  // Sort by creation date (newest first)
  articles.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

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
