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
    if (hash === invitationConfig.global.codeHash && expiresAt > Date.now()) {
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

  function checkArticleAccess(slug, lockHash) {
    if (!invitationConfig.article.enabled) return true
    try {
      const raw = localStorage.getItem('invitation-article-' + slug)
      if (!raw) return false
      const { hash, expiresAt } = JSON.parse(raw)
      if (hash === lockHash && expiresAt > Date.now()) {
        return true
      }
      localStorage.removeItem('invitation-article-' + slug)
      return false
    } catch {
      return false
    }
  }

  async function submitArticleCode(slug, code, lockHash) {
    const hash = await sha256(code)
    if (hash === lockHash) {
      localStorage.setItem('invitation-article-' + slug, JSON.stringify({
        hash,
        expiresAt: Date.now() + EXPIRE_MS
      }))
      return true
    }
    return false
  }

  return {
    globalVerified,
    submitGlobalCode,
    checkArticleAccess,
    submitArticleCode
  }
}
