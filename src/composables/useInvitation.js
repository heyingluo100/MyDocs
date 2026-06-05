import { ref } from 'vue'
import invitationConfig from '../config/invitation.js'

const EXPIRE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const PBKDF2_ITERATIONS = 200000

// 频率限制：每个 slug 独立计数（全站锁用 'global' 这一个 key）
// 5 次失败后锁 5 分钟；之前每次失败按 2^N 秒指数退避（封顶 8 秒）
const MAX_FAILS = 5
const LOCK_MS = 5 * 60 * 1000
const failStates = new Map() // key → { count, lockUntil, lastFailAt }

function checkRateLimit(key) {
  const state = failStates.get(key)
  if (!state) return { allowed: true }
  if (Date.now() < state.lockUntil) {
    return {
      allowed: false,
      locked: true,
      retryAfter: Math.ceil((state.lockUntil - Date.now()) / 1000)
    }
  }
  return { allowed: true }
}

async function recordFailure(key) {
  const state = failStates.get(key) || { count: 0, lockUntil: 0, lastFailAt: 0 }
  state.count++
  state.lastFailAt = Date.now()
  if (state.count >= MAX_FAILS) {
    state.lockUntil = Date.now() + LOCK_MS
    state.count = 0 // 锁定后清零，解锁后重新计
  } else {
    // 指数退避：第 N 次失败后等待 2^N 秒（封顶 8 秒）
    const backoff = Math.min(Math.pow(2, state.count) * 1000, 8000)
    failStates.set(key, state)
    await new Promise(r => setTimeout(r, backoff))
    return
  }
  failStates.set(key, state)
}

function recordSuccess(key) {
  failStates.delete(key)
}

// Singleton state
const globalVerified = ref(false)
// 已解锁文章 slug 集合(响应式)。模板用这个做图标判断,纯同步,无 Promise 坑。
const unlockedSlugs = ref(new Set())

// Initialize: check localStorage for valid global access
;(function initGlobal() {
  if (!invitationConfig.global.enabled) {
    globalVerified.value = true
    return
  }
  try {
    const raw = localStorage.getItem('invitation-global')
    if (!raw) return
    const { hash, expiresAt } = JSON.parse(raw)
    if (expiresAt > Date.now()) {
      // We'll verify the hash lazily when needed; for now trust the expiry
      globalVerified.value = true
    } else {
      localStorage.removeItem('invitation-global')
    }
  } catch {
    localStorage.removeItem('invitation-global')
  }
})()

// Initialize: scan localStorage for all valid article unlocks
;(function initArticleUnlocks() {
  try {
    const set = new Set()
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k || !k.startsWith('invitation-article-')) continue
      try {
        const { expiresAt } = JSON.parse(localStorage.getItem(k))
        if (expiresAt > Date.now()) {
          set.add(k.slice('invitation-article-'.length))
        } else {
          localStorage.removeItem(k)
        }
      } catch {
        localStorage.removeItem(k)
      }
    }
    unlockedSlugs.value = set
  } catch {}
})()

async function sha256Hex(text) {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const buffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

function b64ToBytes(b64) {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0))
}

// PBKDF2 派生 AES-256-GCM 密钥（v2 协议）
async function deriveKeyV2(hashHex, saltBytes) {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(hashHex),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  )
}

async function decryptContent(encryptedObj, hashHex) {
  const iv = b64ToBytes(encryptedObj.iv)
  const ctAndTag = b64ToBytes(encryptedObj.ct)

  let key
  if (encryptedObj.v === 2 && encryptedObj.salt) {
    // v2: PBKDF2 + salt
    const salt = b64ToBytes(encryptedObj.salt)
    key = await deriveKeyV2(hashHex, salt)
  } else {
    // v1（兼容旧产物）: hashHex 直接当 key
    const keyBytes = hexToBytes(hashHex)
    key = await crypto.subtle.importKey(
      'raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']
    )
  }

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv }, key, ctAndTag
  )
  return new TextDecoder().decode(decrypted)
}

export function useInvitation() {

  async function submitGlobalCode(code) {
    const limit = checkRateLimit('global')
    if (!limit.allowed) {
      return { success: false, locked: true, retryAfter: limit.retryAfter }
    }
    const hash = await sha256Hex(code)
    if (hash === invitationConfig.global.codeHash) {
      localStorage.setItem('invitation-global', JSON.stringify({
        hash,
        expiresAt: Date.now() + EXPIRE_MS
      }))
      globalVerified.value = true
      recordSuccess('global')
      return { success: true }
    }
    await recordFailure('global')
    return { success: false }
  }

  async function checkArticleAccess(slug, encryptedContent) {
    if (!invitationConfig.article.enabled) return { unlocked: true, content: null }
    if (!encryptedContent || !encryptedContent.iv) return { unlocked: true, content: null }
    try {
      const raw = localStorage.getItem('invitation-article-' + slug)
      if (!raw) {
        // 过期清理后同步响应式集合
        if (unlockedSlugs.value.has(slug)) {
          const next = new Set(unlockedSlugs.value)
          next.delete(slug)
          unlockedSlugs.value = next
        }
        return { unlocked: false }
      }
      const { hash, expiresAt } = JSON.parse(raw)
      if (expiresAt <= Date.now()) {
        localStorage.removeItem('invitation-article-' + slug)
        if (unlockedSlugs.value.has(slug)) {
          const next = new Set(unlockedSlugs.value)
          next.delete(slug)
          unlockedSlugs.value = next
        }
        return { unlocked: false }
      }
      const decrypted = await decryptContent(encryptedContent, hash)
      // 解锁成功,确保响应式集合包含
      if (!unlockedSlugs.value.has(slug)) {
        const next = new Set(unlockedSlugs.value)
        next.add(slug)
        unlockedSlugs.value = next
      }
      return { unlocked: true, content: decrypted }
    } catch {
      localStorage.removeItem('invitation-article-' + slug)
      return { unlocked: false }
    }
  }

  async function submitArticleCode(slug, code, encryptedContent) {
    const limit = checkRateLimit('article-' + slug)
    if (!limit.allowed) {
      return { success: false, locked: true, retryAfter: limit.retryAfter }
    }
    const hash = await sha256Hex(code)
    try {
      const decrypted = await decryptContent(encryptedContent, hash)
      localStorage.setItem('invitation-article-' + slug, JSON.stringify({
        hash,
        expiresAt: Date.now() + EXPIRE_MS
      }))
      // 加入响应式集合,触发 UI 图标更新
      const next = new Set(unlockedSlugs.value)
      next.add(slug)
      unlockedSlugs.value = next
      recordSuccess('article-' + slug)
      return { success: true, content: decrypted }
    } catch {
      await recordFailure('article-' + slug)
      return { success: false }
    }
  }

  // 同步检查:仅看 localStorage 是否有未过期记录,不解密。供模板图标判断用。
  function isArticleUnlocked(slug) {
    return unlockedSlugs.value.has(slug)
  }

  return {
    globalVerified,
    submitGlobalCode,
    checkArticleAccess,
    submitArticleCode,
    isArticleUnlocked
  }
}
