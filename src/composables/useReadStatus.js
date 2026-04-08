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
  const markAsRead = (slug) => {
    articleStatus[slug] = new Date().toISOString()
    saveStore(STORAGE_KEY, articleStatus)
  }

  const isArticleRead = (slug, updatedAt) => {
    const readAt = articleStatus[slug]
    if (!readAt) return false
    return readAt >= updatedAt
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
    const now = new Date()
    const created = new Date(article.createdAt)
    const daysSinceCreated = (now - created) / (1000 * 60 * 60 * 24)

    // New article: created within N days and not read
    if (daysSinceCreated <= NEW_ARTICLE_DAYS && !articleStatus[article.slug]) {
      return 'new'
    }

    // Updated article: updatedAt !== createdAt and not read since update
    if (article.updatedAt && article.updatedAt !== article.createdAt) {
      if (!isArticleRead(article.slug, article.updatedAt)) {
        return 'updated'
      }
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
