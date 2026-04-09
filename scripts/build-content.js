import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
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
  try {
    // Use git log for stable dates across environments (Vercel, CI, etc.)
    const relPath = path.relative(root, filePath).replace(/\\/g, '/')
    // First commit date = createdAt
    const gitCreated = execSync(
      `git log --diff-filter=A --follow --format=%aI -- "${relPath}"`,
      { cwd: root, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim().split('\n').pop()
    // Latest commit date = updatedAt
    const gitUpdated = execSync(
      `git log -1 --format=%aI -- "${relPath}"`,
      { cwd: root, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim()

    if (gitCreated && gitUpdated) {
      return {
        createdAt: gitCreated.split('T')[0],
        updatedAt: gitUpdated.split('T')[0]
      }
    }
  } catch {
    // git not available or file not tracked — fall through
  }
  // Fallback to filesystem dates
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

function trimTrailingEmpty(html) {
  return html.replace(/(\s*<p>(\s|<br\s*\/?>|&nbsp;)*<\/p>)*\s*$/gi, '')
}

function countWords(html) {
  const text = html.replace(/<[^>]+>/g, '').replace(/\s+/g, '')
  return text.length
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
    content: trimTrailingEmpty(htmlContent)
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
    content: trimTrailingEmpty(htmlContent)
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
    content: trimTrailingEmpty(htmlContent)
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
    content: trimTrailingEmpty(htmlContent)
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
  const collections = []
  let filesCopied = 0

  // Process a single file and return an article entry (or null)
  async function processFile(filePath, tags, collection, collectionSlug) {
    const file = path.basename(filePath)
    const ext = path.extname(file).toLowerCase()
    const baseName = path.basename(file, ext)

    if (file.startsWith('~$')) return null
    if (file === '.tags') return null
    if (file === '.lock') return null
    if (file === '.pin') return null
    if (ext === '.lock') return null
    if (ext === '.pin') return null
    if (file.endsWith('.tags')) return null
    if (fs.statSync(filePath).isDirectory()) return null

    const primaryTag = tags[0]
    const slugBase = collection
      ? slugify(primaryTag + '-' + collection + '-' + baseName)
      : slugify(primaryTag + '-' + baseName)
    const slug = slugBase || baseName

    // Check for .lock file (article-level invitation code)
    const lockFilePath = path.join(path.dirname(filePath), baseName + '.lock')
    let locked = false
    let lockHash = ''
    if (fs.existsSync(lockFilePath)) {
      lockHash = fs.readFileSync(lockFilePath, 'utf-8').trim()
      if (lockHash) locked = true
    }

    // Check for .pin file (article-level pinning)
    const pinFilePath = path.join(path.dirname(filePath), baseName + '.pin')
    let pinned = false
    let pinOrder = 0
    let pinTag = ''
    if (fs.existsSync(pinFilePath)) {
      pinned = true
      const pinContent = fs.readFileSync(pinFilePath, 'utf-8').trim()
      if (pinContent) {
        const parts = pinContent.split(/\s+/)
        const num = parseInt(parts[0], 10)
        if (!isNaN(num)) pinOrder = num
        if (parts.length > 1) pinTag = parts.slice(1).join(' ')
      }
    }

    if (MARKDOWN_EXTS.includes(ext)) {
      try {
        const result = await processMarkdown(filePath)
        return {
          slug, title: result.title, tags, locked, lockHash, pinned, pinOrder, pinTag,
          collection: collection || null, collectionSlug: collectionSlug || null,
          createdAt: result.createdAt, updatedAt: result.updatedAt,
          summary: result.summary, files: [],
          wordCount: countWords(result.content),
          content: Buffer.from(result.content).toString('base64')
        }
      } catch (err) {
        console.error(`[build-content] 处理 ${file} 失败:`, err.message)
      }
    } else if (WORD_EXTS.includes(ext)) {
      try {
        const result = await processDocx(filePath)
        return {
          slug, title: result.title, tags, locked, lockHash, pinned, pinOrder, pinTag,
          collection: collection || null, collectionSlug: collectionSlug || null,
          createdAt: result.createdAt, updatedAt: result.updatedAt,
          summary: result.summary, files: [],
          wordCount: countWords(result.content),
          content: Buffer.from(result.content).toString('base64')
        }
      } catch (err) {
        console.error(`[build-content] 处理 ${file} 失败:`, err.message)
      }
    } else if (DOC_EXTS.includes(ext)) {
      try {
        const result = await processDoc(filePath)
        return {
          slug, title: result.title, tags, locked, lockHash, pinned, pinOrder, pinTag,
          collection: collection || null, collectionSlug: collectionSlug || null,
          createdAt: result.createdAt, updatedAt: result.updatedAt,
          summary: result.summary, files: [],
          wordCount: countWords(result.content),
          content: Buffer.from(result.content).toString('base64')
        }
      } catch (err) {
        console.error(`[build-content] 处理 ${file} 失败:`, err.message)
      }
    } else if (TEXT_EXTS.includes(ext)) {
      try {
        const result = processText(filePath)
        return {
          slug, title: result.title, tags, locked, lockHash, pinned, pinOrder, pinTag,
          collection: collection || null, collectionSlug: collectionSlug || null,
          createdAt: result.createdAt, updatedAt: result.updatedAt,
          summary: result.summary, files: [],
          wordCount: countWords(result.content),
          content: Buffer.from(result.content).toString('base64')
        }
      } catch (err) {
        console.error(`[build-content] 处理 ${file} 失败:`, err.message)
      }
    } else if (OTHER_FILE_EXTS.includes(ext)) {
      fs.copyFileSync(filePath, path.join(publicFiles, file))
      filesCopied++
      const otherContent = `<p>此文档为 ${ext.replace('.', '').toUpperCase()} 文件，请点击下方附件查看。</p>`
      return {
        slug, title: baseName, tags: [...tags], locked, lockHash, pinned, pinOrder, pinTag,
        collection: collection || null, collectionSlug: collectionSlug || null,
        ...getFileDates(filePath),
        summary: `${ext.replace('.', '').toUpperCase()} 文件`,
        files: [file],
        wordCount: countWords(otherContent),
        content: Buffer.from(otherContent).toString('base64')
      }
    }
    return null
  }

  // Scan top-level directories in content/ — each folder is a tag
  const entries = fs.readdirSync(contentDir, { withFileTypes: true })
  const tagFolders = entries.filter(e => e.isDirectory())

  if (tagFolders.length === 0) {
    fs.writeFileSync(outputJson, '[]')
    console.log('[build-content] content/ 下没有分类文件夹。请创建文件夹（如 content/工作/）并放入 .docx 或 .md 文件。')
    return
  }

  // Read extra tags from a .tags file (one tag per line)
  function readExtraTags(tagsFilePath) {
    try {
      if (!fs.existsSync(tagsFilePath)) return []
      return fs.readFileSync(tagsFilePath, 'utf-8')
        .split(/\r?\n/)
        .map(t => t.trim())
        .filter(t => t.length > 0)
    } catch {
      return []
    }
  }

  for (const folder of tagFolders) {
    const tag = folder.name
    const folderPath = path.join(contentDir, tag)
    const files = fs.readdirSync(folderPath)

    for (const file of files) {
      const filePath = path.join(folderPath, file)

      // Sub-directory = collection
      if (fs.statSync(filePath).isDirectory()) {
        const collectionName = file
        const colSlug = slugify(tag + '-' + collectionName) || collectionName
        const subFiles = fs.readdirSync(filePath).sort((a, b) => a.localeCompare(b, 'zh-CN'))

        // Read .tags file inside collection folder for extra tags
        const extraTags = readExtraTags(path.join(filePath, '.tags'))
        const collectionTags = [tag, ...extraTags.filter(t => t !== tag)]

        // Read collection-level .lock file (locks all articles in this collection)
        const colLockPath = path.join(filePath, '.lock')
        let colLocked = false
        let colLockHash = ''
        if (fs.existsSync(colLockPath)) {
          colLockHash = fs.readFileSync(colLockPath, 'utf-8').trim()
          if (colLockHash) colLocked = true
        }

        // Read collection-level .pin file (pins the collection)
        const colPinPath = path.join(filePath, '.pin')
        let colPinned = false
        let colPinOrder = 0
        let colPinTag = ''
        if (fs.existsSync(colPinPath)) {
          colPinned = true
          const pinContent = fs.readFileSync(colPinPath, 'utf-8').trim()
          if (pinContent) {
            const parts = pinContent.split(/\s+/)
            const num = parseInt(parts[0], 10)
            if (!isNaN(num)) colPinOrder = num
            if (parts.length > 1) colPinTag = parts.slice(1).join(' ')
          }
        }

        let count = 0
        for (const subFile of subFiles) {
          const subFilePath = path.join(filePath, subFile)
          const article = await processFile(subFilePath, collectionTags, collectionName, colSlug)
          if (article) {
            // Collection-level lock applies to all articles (unless article has its own .lock)
            if (colLocked && !article.locked) {
              article.locked = true
              article.lockHash = colLockHash
            }
            articles.push(article)
            count++
          }
        }

        if (count > 0) {
          collections.push({ name: collectionName, slug: colSlug, tag, tags: collectionTags, count, pinned: colPinned, pinOrder: colPinOrder, pinTag: colPinTag })
        }
        continue
      }

      // Skip .tags files at tag folder level
      if (file === '.tags') continue

      // Read per-file extra tags (e.g. "文件名.tags" for "文件名.md")
      const ext = path.extname(file).toLowerCase()
      const baseName = path.basename(file, ext)
      const perFileTags = readExtraTags(path.join(folderPath, baseName + '.tags'))
      const fileTags = [tag, ...perFileTags.filter(t => t !== tag)]

      // Regular file = standalone article
      const article = await processFile(filePath, fileTags, null, null)
      if (article) articles.push(article)
    }
  }

  // Sort by creation date (newest first)
  articles.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  // Collect all tag names (including empty folders + extra tags from .tags files)
  const tagSet = new Set(tagFolders.map(f => f.name))
  articles.forEach(a => a.tags.forEach(t => tagSet.add(t)))
  const allTags = [...tagSet]

  const output = { allTags, allCollections: collections, articles }
  fs.writeFileSync(outputJson, JSON.stringify(output, null, 2))
  console.log(`[build-content] ✅ 构建完成：${articles.length} 篇文档，${tagFolders.length} 个分类，${collections.length} 个合集`)
  if (filesCopied > 0) {
    console.log(`[build-content] 📎 复制了 ${filesCopied} 个附件文件到 public/files/`)
  }
}

buildArticles()
