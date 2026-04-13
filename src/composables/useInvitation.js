import { ref } from 'vue'
import invitationConfig from '../config/invitation.js'

const EXPIRE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

// Singleton state
const globalVerified = ref(false)

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

async function sha256(text) {
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

async function decryptContent(encryptedObj, hashHex) {
  const keyBytes = hexToBytes(hashHex)
  const key = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']
  )
  const iv = Uint8Array.from(atob(encryptedObj.iv), c => c.charCodeAt(0))
  const ctAndTag = Uint8Array.from(atob(encryptedObj.ct), c => c.charCodeAt(0))
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv }, key, ctAndTag
  )
  return new TextDecoder().decode(decrypted)
}

export function useInvitation() {

  async function submitGlobalCode(code) {
    const hash = await sha256(code)
    if (hash === invitationConfig.global.codeHash) {
      localStorage.setItem('invitation-global', JSON.stringify({
        hash,
        expiresAt: Date.now() + EXPIRE_MS
      }))
      globalVerified.value = true
      return true
    }
    return false
  }

  async function checkArticleAccess(slug, encryptedContent) {
    if (!invitationConfig.article.enabled) return { unlocked: true, content: null }
    if (!encryptedContent || !encryptedContent.iv) return { unlocked: true, content: null }
    try {
      const raw = localStorage.getItem('invitation-article-' + slug)
      if (!raw) return { unlocked: false }
      const { hash, expiresAt } = JSON.parse(raw)
      if (expiresAt <= Date.now()) {
        localStorage.removeItem('invitation-article-' + slug)
        return { unlocked: false }
      }
      const decrypted = await decryptContent(encryptedContent, hash)
      return { unlocked: true, content: decrypted }
    } catch {
      localStorage.removeItem('invitation-article-' + slug)
      return { unlocked: false }
    }
  }

  async function submitArticleCode(slug, code, encryptedContent) {
    const hash = await sha256(code)
    try {
      const decrypted = await decryptContent(encryptedContent, hash)
      localStorage.setItem('invitation-article-' + slug, JSON.stringify({
        hash,
        expiresAt: Date.now() + EXPIRE_MS
      }))
      return { success: true, content: decrypted }
    } catch {
      return { success: false }
    }
  }

  return {
    globalVerified,
    submitGlobalCode,
    checkArticleAccess,
    submitArticleCode
  }
}
