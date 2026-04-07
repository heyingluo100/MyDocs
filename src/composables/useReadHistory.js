const STORAGE_KEY = 'article-read-history'

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

  return { hasUpdatedSinceLastRead, markAsRead }
}
