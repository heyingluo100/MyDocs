import { ref, computed } from 'vue'

// Module-level refs (singleton, shared across all components)
const articles = ref([])
const tagNames = ref([])
const collectionList = ref([])
const loaded = ref(false)

function updateData(newData) {
  articles.value = newData.articles || []
  tagNames.value = newData.allTags || []
  collectionList.value = newData.allCollections || []
  loaded.value = true
}

// Initial load via fetch (not import, so Vite won't HMR it)
fetch('/articles.json')
  .then(r => r.json())
  .then(data => updateData(data))
  .catch(() => console.error('[useArticles] 加载 articles.json 失败'))

// Listen for HMR content updates in dev mode
if (import.meta.hot) {
  import.meta.hot.on('content-update', (data) => {
    console.log('[HMR] 内容更新，文档数:', data.articles?.length, '分类数:', data.allTags?.length)
    updateData(data)
  })
}

export function useArticles() {
  const allTags = computed(() => {
    const tagMap = {}
    tagNames.value.forEach(name => { tagMap[name] = 0 })
    articles.value.forEach(article => {
      article.tags.forEach(tag => {
        tagMap[tag] = (tagMap[tag] || 0) + 1
      })
    })
    return Object.entries(tagMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  })

  const allCollections = computed(() => collectionList.value)

  const getArticlesByTag = (tag) => {
    if (!tag) return articles.value
    return articles.value.filter(a => a.tags.includes(tag))
  }

  const getArticleBySlug = (slug) => {
    return articles.value.find(a => a.slug === slug) || null
  }

  const getArticlesByCollection = (collectionSlug) => {
    return articles.value.filter(a => a.collectionSlug === collectionSlug)
  }

  const getCollectionBySlug = (slug) => {
    return collectionList.value.find(c => c.slug === slug) || null
  }

  const decodeContent = (encoded) => {
    try {
      const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0))
      return new TextDecoder('utf-8').decode(bytes)
    } catch {
      return encoded
    }
  }

  const getAdjacentArticles = (slug) => {
    const article = articles.value.find(a => a.slug === slug)
    if (!article) return { prev: null, next: null, siblings: [] }

    // If article is in a collection with multiple articles, navigate within the collection
    if (article.collectionSlug) {
      const siblings = articles.value.filter(a => a.collectionSlug === article.collectionSlug)
      if (siblings.length > 1) {
        const index = siblings.findIndex(a => a.slug === slug)
        return {
          prev: index > 0 ? siblings[index - 1] : null,
          next: index < siblings.length - 1 ? siblings[index + 1] : null,
          siblings
        }
      }
    }

    // Otherwise navigate within the same tag
    if (!article.tags.length) return { prev: null, next: null, siblings: [] }
    const tag = article.tags[0]
    const siblings = articles.value.filter(a => a.tags.includes(tag))
    const index = siblings.findIndex(a => a.slug === slug)
    return {
      prev: index > 0 ? siblings[index - 1] : null,
      next: index < siblings.length - 1 ? siblings[index + 1] : null,
      siblings
    }
  }

  return {
    articles,
    allTags,
    allCollections,
    loaded,
    getArticlesByTag,
    getArticleBySlug,
    getArticlesByCollection,
    getCollectionBySlug,
    getAdjacentArticles,
    decodeContent
  }
}
