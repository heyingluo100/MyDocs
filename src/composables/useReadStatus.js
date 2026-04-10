import { reactive } from 'vue'

const STORAGE_KEY = 'read-status'
const COLLECTION_STORAGE_KEY = 'collection-read-status'
const NEW_ARTICLE_DAYS = 3

function loadStore(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}')
  } catch {
    return {}
  }
}

function saveStore(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

// Reactive state shared across components
const articleStatus = reactive(loadStore(STORAGE_KEY))
const collectionStatus = reactive(loadStore(COLLECTION_STORAGE_KEY))

export function useReadStatus() {
  const markAsRead = (slug, updatedAt) => {
    articleStatus[slug] = updatedAt
    saveStore(STORAGE_KEY, articleStatus)
  }

  const isArticleRead = (slug, updatedAt) => {
    const saved = articleStatus[slug]
    if (!saved) return false
    // New format: stored value is a date string like "2026-02-14"
    if (saved === updatedAt) return true
    // Old format: stored value is ISO timestamp like "2026-04-09T10:00:00.000Z"
    // Extract date part and compare — user read it at that date, so if readDate >= updatedAt, it's read
    if (saved.includes('T')) {
      return saved.split('T')[0] >= updatedAt
    }
    return false
  }

  const markCollectionAsRead = (slug, articleCount) => {
    collectionStatus[slug] = { readAt: new Date().toISOString(), count: articleCount }
    saveStore(COLLECTION_STORAGE_KEY, collectionStatus)
  }

  const isCollectionRead = (slug, currentCount) => {
    const record = collectionStatus[slug]
    if (!record) return false
    return record.count >= currentCount
  }

  const getArticleDotType = (article) => {
    const effectiveUpdatedAt = article.updatedAt || article.createdAt

    // Never read this article before
    if (!articleStatus[article.slug]) {
      const now = new Date()
      const created = new Date(article.createdAt)
      const daysSinceCreated = (now - created) / (1000 * 60 * 60 * 24)
      // New article: created within N days
      if (daysSinceCreated <= NEW_ARTICLE_DAYS) {
        return 'new'
      }
      return null
    }

    // Read before, but content has been updated since
    if (!isArticleRead(article.slug, effectiveUpdatedAt)) {
      return 'updated'
    }

    return null
  }

  const getCollectionDotType = (slug, currentCount) => {
    if (!isCollectionRead(slug, currentCount)) {
      const record = collectionStatus[slug]
      // Never visited or new articles added
      if (!record || record.count < currentCount) {
        return 'updated'
      }
    }
    return null
  }

  return {
    markAsRead,
    isArticleRead,
    markCollectionAsRead,
    isCollectionRead,
    getArticleDotType,
    getCollectionDotType
  }
}
