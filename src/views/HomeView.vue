<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useArticles } from '../composables/useArticles.js'
import TagPopover from '../components/TagPopover.vue'
import TagBottomSheet from '../components/TagBottomSheet.vue'
import ArticleCard from '../components/ArticleCard.vue'
import CollectionCard from '../components/CollectionCard.vue'

const route = useRoute()
const { getArticlesByTag, allCollections } = useArticles()
const showMobileSheet = ref(false)

const currentTag = computed(() => {
  return route.params.tag ? decodeURIComponent(route.params.tag) : ''
})

const filteredArticles = computed(() => {
  return getArticlesByTag(currentTag.value)
})

// Build mixed list: standalone articles + collection groups
const mixedItems = computed(() => {
  const articles = filteredArticles.value
  const items = []
  const seenCollections = new Set()

  // Collect standalone articles
  const standaloneArticles = articles.filter(a => !a.collectionSlug)

  // Collect collections relevant to current filter
  const relevantCollections = currentTag.value
    ? allCollections.value.filter(c => (c.tags || [c.tag]).includes(currentTag.value))
    : allCollections.value

  // Build collection items with their articles
  for (const col of relevantCollections) {
    const colArticles = articles.filter(a => a.collectionSlug === col.slug)
    if (colArticles.length === 0) continue
    seenCollections.add(col.slug)
    // Use the newest article's createdAt as the collection's sort date
    const sortDate = colArticles.reduce((max, a) => a.createdAt > max ? a.createdAt : max, colArticles[0].createdAt)
    items.push({ type: 'collection', collection: col, articles: colArticles, sortDate })
  }

  // Add standalone articles
  for (const article of standaloneArticles) {
    items.push({ type: 'article', article, sortDate: article.createdAt })
  }

  // Sort by creation date (newest first)
  items.sort((a, b) => b.sortDate.localeCompare(a.sortDate))

  return items
})

const totalCount = computed(() => filteredArticles.value.length)
</script>

<template>
  <div>
    <div class="flex flex-col lg:flex-row gap-8">
    <!-- Desktop sidebar (popover trigger) -->
    <div class="hidden lg:block shrink-0">
      <TagPopover :active-tag="currentTag" />
    </div>

    <!-- Article list -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-3 mb-6">
        <h1 class="text-xl font-bold text-linear-text">
          {{ currentTag || '全部文档' }}
        </h1>
        <span class="text-sm text-linear-text-secondary">
          {{ totalCount }} 篇
        </span>

        <!-- Mobile filter button -->
        <button
          class="lg:hidden ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all duration-300 bg-linear-bg-secondary text-linear-text-secondary border-linear-border hover:bg-linear-bg-tertiary"
          @click="showMobileSheet = true"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          分类
        </button>
      </div>

      <div v-if="mixedItems.length" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <template v-for="item in mixedItems" :key="item.type === 'article' ? item.article.slug : item.collection.slug">
          <ArticleCard v-if="item.type === 'article'" :article="item.article" />
          <CollectionCard v-else :collection="item.collection" :articles="item.articles" />
        </template>
      </div>

      <div v-else class="text-center py-20">
        <p class="text-linear-text-secondary">暂无文档</p>
      </div>
    </div>
  </div>

  <!-- Mobile bottom sheet -->
  <TagBottomSheet v-model:open="showMobileSheet" :active-tag="currentTag" />
  </div>
</template>
