import { ref, computed } from 'vue'
import articlesData from '../data/articles.json'

export function useArticles() {
  const articles = ref(articlesData)

  const allTags = computed(() => {
    const tagMap = {}
    articles.value.forEach(article => {
      article.tags.forEach(tag => {
        tagMap[tag] = (tagMap[tag] || 0) + 1
      })
    })
    return Object.entries(tagMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  })

  const getArticlesByTag = (tag) => {
    if (!tag) return articles.value
    return articles.value.filter(a => a.tags.includes(tag))
  }

  const getArticleBySlug = (slug) => {
    return articles.value.find(a => a.slug === slug) || null
  }

  const decodeContent = (encoded) => {
    try {
      return atob(encoded)
    } catch {
      return encoded
    }
  }

  return {
    articles,
    allTags,
    getArticlesByTag,
    getArticleBySlug,
    decodeContent
  }
}
