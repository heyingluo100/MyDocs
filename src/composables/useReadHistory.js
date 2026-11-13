const STORAGE_KEY = 'article-read-history'
const POSITION_KEY = 'article-read-position'
const POSITION_EXPIRE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function simpleHash(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return hash.toString(36)
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function getPositions() {
  try {
    return JSON.parse(localStorage.getItem(POSITION_KEY) || '{}')
  } catch {
    return {}
  }
}

export function useReadHistory() {
  function hasUpdatedSinceLastRead(slug, content) {
    const history = getHistory()
    if (!history[slug]) return false
    return history[slug] !== simpleHash(content)
  }

  function markAsRead(slug, content) {
    const history = getHistory()
    history[slug] = simpleHash(content)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  }

  // 直接使用构建期算好的 contentHash（与 simpleHash(整段 content) 同算法，
  // 因此老 localStorage 记录无需迁移即可继续匹配）
  function hasUpdatedSinceLastReadHash(slug, hash) {
    if (!hash) return false
    const history = getHistory()
    if (!history[slug]) return false
    return history[slug] !== hash
  }

  function markAsReadHash(slug, hash) {
    if (!hash) return
    const history = getHistory()
    history[slug] = hash
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  }

  // Reading position tracking
  function saveReadingPosition(slug, progress) {
    if (progress < 5 || progress > 90) return
    const positions = getPositions()
    positions[slug] = { progress, timestamp: Date.now() }
    localStorage.setItem(POSITION_KEY, JSON.stringify(positions))
  }

  function getReadingPosition(slug) {
    const positions = getPositions()
    const record = positions[slug]
    if (!record) return null
    if (Date.now() - record.timestamp > POSITION_EXPIRE_MS) {
      clearReadingPosition(slug)
      return null
    }
    if (record.progress < 5 || record.progress > 90) return null
    return record.progress
  }

  function clearReadingPosition(slug) {
    const positions = getPositions()
    delete positions[slug]
    localStorage.setItem(POSITION_KEY, JSON.stringify(positions))
  }

  return {
    hasUpdatedSinceLastRead,
    markAsRead,
    hasUpdatedSinceLastReadHash,
    markAsReadHash,
    saveReadingPosition,
    getReadingPosition,
    clearReadingPosition
  }
}
