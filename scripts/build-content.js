import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execFileSync } from 'child_process'
import crypto from 'crypto'
import matter from 'gray-matter'
import MarkdownIt from 'markdown-it'
import mammoth from 'mammoth'
import WordExtractor from 'word-extractor'
import JSZip from 'jszip'
import invitationConfig from '../src/config/invitation.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const contentDir = path.join(root, 'content')
const outputJson = path.join(root, '.content-cache', 'articles.json')
const publicFiles = path.join(root, 'public', 'files')

const md = new MarkdownIt({
  // 禁止原生 HTML 注入：作者写的 markdown 中如果带 <script>/<img onerror>
  // 会原样进 Closed Shadow DOM 执行（自用是 self-XSS，开放投稿则是真 XSS）
  html: false,
  linkify: true,
  typographer: true
})

// Supported file extensions
const MARKDOWN_EXTS = ['.md', '.markdown']
const WORD_EXTS = ['.docx']
const DOC_EXTS = ['.doc']
const TEXT_EXTS = ['.txt']
const OTHER_FILE_EXTS = ['.pdf', '.xlsx', '.xls', '.pptx', '.ppt', '.csv']

// AES-256-GCM encryption for locked articles
// 密钥派生：PBKDF2(SHA-256, 200000 iterations) — 在 sha256(code) 基础上再加 200k 次 SHA-256
// 攻击者暴力破解 code 的成本提升 200000 倍（每次尝试需完成完整 PBKDF2）
const PBKDF2_ITERATIONS = 200000
const PBKDF2_KEYLEN = 32 // 32 bytes = AES-256
const SALT_LEN = 16

function encryptContent(plainBase64, hashHex) {
  // salt 由内容衍生（同样内容+同样邀请码 → 同样密文，避免每次 build 改变产物）
  const salt = crypto.createHash('sha256').update(plainBase64).digest().subarray(0, SALT_LEN)
  // PBKDF2 password 用 lockHash（hex 字符串），客户端也用相同输入做派生
  const key = crypto.pbkdf2Sync(hashHex, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, 'sha256')
  // IV 同样确定性派生，混入 salt 区分
  const iv = crypto.createHash('md5').update(Buffer.concat([salt, Buffer.from(plainBase64, 'utf8')])).digest().subarray(0, 12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plainBase64, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag() // 16 bytes
  return {
    v: 2, // 协议版本：v2 = PBKDF2 + salt
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    ct: Buffer.concat([encrypted, tag]).toString('base64')
  }
}

// addedAt = 文件加入本站的日期（git 首次提交日，沿用旧 createdAt 逻辑保证旧文章时间不丢）
// updatedAt = 文件最近更新日期
// createdAt = 文档真实创作日期（仅 docx 从元数据取，其他格式留空）
function getFileDates(filePath) {
  try {
    const relPath = path.relative(root, filePath).replace(/\\/g, '/')
    // 用 execFileSync 跳过 shell 解析，避免文件名含 $/`/" 等导致的命令注入
    const gitAdded = execFileSync(
      'git',
      ['log', '--diff-filter=A', '--follow', '--format=%aI', '--', relPath],
      { cwd: root, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim().split('\n').pop()
    const gitUpdated = execFileSync(
      'git',
      ['log', '-1', '--format=%aI', '--', relPath],
      { cwd: root, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim()

    if (gitAdded && gitUpdated) {
      return {
        addedAt: gitAdded.split('T')[0],
        updatedAt: gitUpdated.split('T')[0]
      }
    }
  } catch {
    // git not available or file not tracked — fall through
  }
  const stat = fs.statSync(filePath)
  return {
    addedAt: stat.birthtime.toISOString().split('T')[0],
    updatedAt: stat.mtime.toISOString().split('T')[0]
  }
}

// 提取 docx 的真实创作日期；取不到返回空字符串（不 fallback 到 git 日期）
async function getDocxOriginalCreatedAt(filePath) {
  try {
    const buffer = fs.readFileSync(filePath)
    const zip = await JSZip.loadAsync(buffer)
    const coreXml = await zip.file('docProps/core.xml')?.async('text')
    if (!coreXml) return ''
    const createdMatch = coreXml.match(/<dcterms:created[^>]*>([^<]+)</)
    return createdMatch ? createdMatch[1].split('T')[0] : ''
  } catch {
    return ''
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
    createdAt: '',
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
  const fileDates = getFileDates(filePath)
  const originalCreatedAt = await getDocxOriginalCreatedAt(filePath)

  return {
    title,
    summary: summary.length >= 100 ? summary + '...' : summary,
    ...fileDates,
    createdAt: originalCreatedAt,
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
    createdAt: '',
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
    createdAt: '',
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
    if (ext === '.note') return null
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

    // Check for .note file (author's note)
    const noteFilePath = path.join(path.dirname(filePath), baseName + '.note')
    let authorNote = ''
    let authorNotePosition = ''
    if (fs.existsSync(noteFilePath)) {
      const noteRaw = fs.readFileSync(noteFilePath, 'utf-8').trim()
      if (noteRaw) {
        const lines = noteRaw.split(/\r?\n/)
        const firstLine = lines[0].trim().toLowerCase()
        if (firstLine === 'top' || firstLine === 'bottom') {
          authorNotePosition = firstLine
          authorNote = md.render(lines.slice(1).join('\n').trim())
        } else {
          authorNotePosition = 'top'
          authorNote = md.render(noteRaw)
        }
      }
    }

    if (MARKDOWN_EXTS.includes(ext)) {
      try {
        const result = await processMarkdown(filePath)
        return {
          slug, title: result.title, tags, locked, lockHash, pinned, pinOrder, pinTag, authorNote, authorNotePosition,
          collection: collection || null, collectionSlug: collectionSlug || null,
          addedAt: result.addedAt, createdAt: result.createdAt, updatedAt: result.updatedAt,
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
          slug, title: result.title, tags, locked, lockHash, pinned, pinOrder, pinTag, authorNote, authorNotePosition,
          collection: collection || null, collectionSlug: collectionSlug || null,
          addedAt: result.addedAt, createdAt: result.createdAt, updatedAt: result.updatedAt,
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
          slug, title: result.title, tags, locked, lockHash, pinned, pinOrder, pinTag, authorNote, authorNotePosition,
          collection: collection || null, collectionSlug: collectionSlug || null,
          addedAt: result.addedAt, createdAt: result.createdAt, updatedAt: result.updatedAt,
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
          slug, title: result.title, tags, locked, lockHash, pinned, pinOrder, pinTag, authorNote, authorNotePosition,
          collection: collection || null, collectionSlug: collectionSlug || null,
          addedAt: result.addedAt, createdAt: result.createdAt, updatedAt: result.updatedAt,
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
        slug, title: baseName, tags: [...tags], locked, lockHash, pinned, pinOrder, pinTag, authorNote, authorNotePosition,
        collection: collection || null, collectionSlug: collectionSlug || null,
        ...getFileDates(filePath),
        createdAt: '',
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

  // Sort by added date (newest first)
  articles.sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''))

  // Collect all tag names (including empty folders + extra tags from .tags files)
  const tagSet = new Set(tagFolders.map(f => f.name))
  articles.forEach(a => a.tags.forEach(t => tagSet.add(t)))
  const allTags = [...tagSet]

  // Encrypt locked articles: content becomes AES-256-GCM ciphertext, lockHash removed
  // Article-lock master switch (invitation.js) gates the whole feature:
  //   enabled: true  → encrypt as before
  //   enabled: false → skip encryption AND clear `locked` so locked articles read as public
  const articleLockEnabled = invitationConfig?.article?.enabled === true
  let encryptedCount = 0
  let unlockedByMasterCount = 0
  for (const article of articles) {
    if (article.locked && article.lockHash) {
      if (articleLockEnabled) {
        article.content = encryptContent(article.content, article.lockHash)
        article.encrypted = true
        delete article.lockHash
        encryptedCount++
      } else {
        // Master switch off: treat as public, drop lock metadata so UI shows no lock
        article.locked = false
        delete article.lockHash
        unlockedByMasterCount++
      }
    } else {
      delete article.lockHash
    }
  }

  const output = { allTags, allCollections: collections, articles }
  fs.writeFileSync(outputJson, JSON.stringify(output, null, 2))
  console.log(`[build-content] ✅ 构建完成：${articles.length} 篇文档，${tagFolders.length} 个分类，${collections.length} 个合集`)
  if (encryptedCount > 0) {
    console.log(`[build-content] 🔒 已加密 ${encryptedCount} 篇锁定文档（AES-256-GCM）`)
  }
  if (unlockedByMasterCount > 0) {
    console.log(`[build-content] ⚠️  单篇锁总闸已关闭：${unlockedByMasterCount} 篇带 .lock 的文章已按公开内容打包（明文）`)
  }
  if (filesCopied > 0) {
    console.log(`[build-content] 📎 复制了 ${filesCopied} 个附件文件到 public/files/`)
  }
}

buildArticles()
