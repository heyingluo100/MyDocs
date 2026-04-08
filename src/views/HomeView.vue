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
const sortBy = ref('created')
const showSortMenu = ref(false)

const sortLabel = computed(() => sortBy.value === 'updated' ? '最近更新' : '最新创建')

const handleSort = (value) => {
  sortBy.value = value
  showSortMenu.value = false
}

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
    const sortDate = sortBy.value === 'updated'
      ? colArticles.reduce((max, a) => (a.updatedAt || a.createdAt) > max ? (a.updatedAt || a.createdAt) : max, colArticles[0].updatedAt || colArticles[0].createdAt)
      : colArticles.reduce((max, a) => a.createdAt > max ? a.createdAt : max, colArticles[0].createdAt)
    items.push({ type: 'collection', collection: col, articles: colArticles, sortDate })
  }

  // Add standalone articles
  for (const article of standaloneArticles) {
    const sortDate = sortBy.value === 'updated'
      ? (article.updatedAt || article.createdAt)
      : article.createdAt
    items.push({ type: 'article', article, sortDate })
  }

  // Sort by selected order (newest first)
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

        <div class="ml-auto flex items-center gap-2">
          <!-- Sort dropdown -->
          <div class="relative">
            <button
              class="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border transition-all duration-300 bg-linear-bg-secondary text-linear-text-secondary border-linear-border hover:bg-linear-bg-tertiary"
              @click="showSortMenu = !showSortMenu"
            >
              {{ sortLabel }}
              <svg class="w-3.5 h-3.5 transition-transform duration-300" :class="showSortMenu ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <Transition name="sort-menu">
              <div
                v-if="showSortMenu"
                class="absolute right-0 top-full mt-1.5 bg-linear-bg rounded-xl border border-linear-border/50 shadow-lg overflow-hidden z-30 min-w-[8rem]"
              >
                <button
                  class="w-full flex items-center justify-between gap-3 px-3 py-2 text-sm transition-colors hover:bg-linear-bg-tertiary"
                  :class="sortBy === 'created' ? 'text-linear-accent' : 'text-linear-text'"
                  @click="handleSort('created')"
                >
                  最新创建
                  <svg v-if="sortBy === 'created'" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button
                  class="w-full flex items-center justify-between gap-3 px-3 py-2 text-sm transition-colors hover:bg-linear-bg-tertiary"
                  :class="sortBy === 'updated' ? 'text-linear-accent' : 'text-linear-text'"
                  @click="handleSort('updated')"
                >
                  最近更新
                  <svg v-if="sortBy === 'updated'" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </div>
            </Transition>
            <!-- Backdrop to close menu -->
            <div v-if="showSortMenu" class="fixed inset-0 z-20" @click="showSortMenu = false"></div>
          </div>

          <!-- Mobile filter button -->
          <button
            class="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all duration-300 bg-linear-bg-secondary text-linear-text-secondary border-linear-border hover:bg-linear-bg-tertiary"
            @click="showMobileSheet = true"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            分类
          </button>
        </div>
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

<style scoped>
.sort-menu-enter-active {
  transition: all 0.2s ease;
}
.sort-menu-leave-active {
  transition: all 0.15s ease;
}
.sort-menu-enter-from,
.sort-menu-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}
</style>
