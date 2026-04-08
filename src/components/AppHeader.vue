<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTheme } from '../composables/useTheme.js'
import { useArticles } from '../composables/useArticles.js'
import { useClickOutside } from '../composables/useClickOutside.js'
import ThemeToggle from './ThemeToggle.vue'

const { theme } = useTheme()
const { articles, allTags, allCollections } = useArticles()
const route = useRoute()
const router = useRouter()

const searchQuery = ref('')
const showMobileSearch = ref(false)
const searchWrapperRef = ref(null)

const currentTag = computed(() => {
  return route.params.tag ? decodeURIComponent(route.params.tag) : ''
})

const currentCollectionSlug = computed(() => {
  return route.name === 'collection' && route.params.slug ? decodeURIComponent(route.params.slug) : ''
})

const searchResults = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return []

  const results = []

  // 标签匹配（全局，不受当前页面限制）
  for (const tag of allTags.value) {
    if (tag.name.toLowerCase().includes(q)) {
      results.push({ type: 'tag', name: tag.name, count: tag.count })
    }
  }

  // 合集匹配（全局，不受当前页面限制）
  for (const col of allCollections.value) {
    if (col.name.toLowerCase().includes(q)) {
      results.push({ type: 'collection', name: col.name, slug: col.slug, count: col.count })
    }
  }

  // 文章标题匹配（受当前页面范围约束）
  let pool = articles.value
  if (currentCollectionSlug.value) {
    pool = pool.filter(a => a.collectionSlug === currentCollectionSlug.value)
  } else if (currentTag.value) {
    pool = pool.filter(a => a.tags.includes(currentTag.value))
  }
  for (const a of pool) {
    if (a.title.toLowerCase().includes(q)) {
      results.push({ type: 'article', article: a })
    }
  }

  return results.slice(0, 8)
})

const hasQuery = computed(() => searchQuery.value.trim().length > 0)
const searchPlaceholder = computed(() => {
  if (currentCollectionSlug.value) {
    const col = allCollections.value.find(c => c.slug === currentCollectionSlug.value)
    return col ? `在「${col.name}」中搜索...` : '搜索文档...'
  }
  return currentTag.value ? `在「${currentTag.value}」中搜索...` : '搜索文档...'
})

const clearSearch = () => {
  searchQuery.value = ''
  showMobileSearch.value = false
}

useClickOutside(searchWrapperRef, clearSearch)

// Clear search on navigation
watch(() => route.fullPath, () => {
  clearSearch()
})
</script>

<template>
  <header class="relative z-20 border-b border-linear-border/50">
    <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
      <router-link to="/" class="flex items-center gap-3 hover:opacity-80 transition-opacity shrink-0">
        <div class="w-8 h-8 rounded-lg bg-linear-accent flex items-center justify-center">
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <span class="text-lg font-semibold text-linear-text">文档库</span>
      </router-link>

      <div class="flex items-center gap-3">
        <!-- Desktop search -->
        <div ref="searchWrapperRef" class="relative hidden sm:block">
          <div class="relative">
            <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-linear-text-secondary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="searchPlaceholder"
              class="w-48 focus:w-64 pl-8 pr-3 py-1.5 text-sm bg-linear-bg-secondary border border-linear-border/50 rounded-lg text-linear-text placeholder:text-linear-text-secondary/50 focus:outline-none focus:border-linear-accent/50 transition-all duration-300"
            />
          </div>

          <!-- Search results dropdown -->
          <div
            v-if="hasQuery"
            class="absolute top-full left-0 right-0 mt-2 bg-linear-bg rounded-xl border border-linear-border/50 shadow-lg overflow-hidden z-30"
          >
            <div v-if="searchResults.length" class="max-h-80 overflow-y-auto py-1">
              <template v-for="item in searchResults" :key="item.type === 'article' ? item.article.slug : item.type + '-' + (item.slug || item.name)">
                <!-- 标签结果 -->
                <router-link
                  v-if="item.type === 'tag'"
                  :to="`/tag/${encodeURIComponent(item.name)}`"
                  class="flex items-center gap-3 px-3 py-2.5 hover:bg-linear-bg-tertiary transition-colors"
                >
                  <svg class="w-4 h-4 text-linear-accent/70 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm text-linear-text truncate">{{ item.name }}</p>
                    <p class="text-xs text-linear-text-secondary/50">标签 · {{ item.count }} 篇</p>
                  </div>
                </router-link>
                <!-- 合集结果 -->
                <router-link
                  v-else-if="item.type === 'collection'"
                  :to="`/collection/${encodeURIComponent(item.slug)}`"
                  class="flex items-center gap-3 px-3 py-2.5 hover:bg-linear-bg-tertiary transition-colors"
                >
                  <svg class="w-4 h-4 text-linear-accent/70 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm text-linear-text truncate">{{ item.name }}</p>
                    <p class="text-xs text-linear-text-secondary/50">合集 · {{ item.count }} 篇</p>
                  </div>
                </router-link>
                <!-- 文章结果 -->
                <router-link
                  v-else
                  :to="`/article/${item.article.slug}`"
                  class="flex items-center gap-3 px-3 py-2.5 hover:bg-linear-bg-tertiary transition-colors"
                >
                  <svg class="w-4 h-4 text-linear-text-secondary/50 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm text-linear-text truncate">{{ item.article.title }}</p>
                    <p class="text-xs text-linear-text-secondary/50">{{ item.article.tags?.[0] }} · {{ item.article.createdAt }}</p>
                  </div>
                </router-link>
              </template>
            </div>
            <div v-else class="px-4 py-6 text-center">
              <p class="text-sm text-linear-text-secondary/60">没有匹配的文档</p>
            </div>
          </div>
        </div>

        <!-- Mobile search button -->
        <button
          class="sm:hidden p-2 rounded-lg text-linear-text-secondary hover:bg-linear-bg-tertiary transition-colors"
          @click="showMobileSearch = !showMobileSearch"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>

        <ThemeToggle />
      </div>
    </div>

    <!-- Mobile search bar (expandable) -->
    <Transition name="slide-down">
      <div v-if="showMobileSearch" ref="searchWrapperRef" class="sm:hidden border-t border-linear-border/30 px-6 py-3">
        <div class="relative">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-linear-text-secondary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="searchPlaceholder"
            class="w-full pl-9 pr-3 py-2 text-sm bg-linear-bg-secondary border border-linear-border/50 rounded-xl text-linear-text placeholder:text-linear-text-secondary/50 focus:outline-none focus:border-linear-accent/50 transition-colors"
          />
        </div>

        <!-- Mobile search results -->
        <div v-if="hasQuery" class="mt-2 bg-linear-bg rounded-xl border border-linear-border/50 shadow-lg overflow-hidden">
          <div v-if="searchResults.length" class="max-h-64 overflow-y-auto py-1">
              <template v-for="item in searchResults" :key="item.type === 'article' ? item.article.slug : item.type + '-' + (item.slug || item.name)">
                <router-link
                  v-if="item.type === 'tag'"
                  :to="`/tag/${encodeURIComponent(item.name)}`"
                  class="flex items-center gap-3 px-3 py-2.5 hover:bg-linear-bg-tertiary transition-colors"
                >
                  <svg class="w-4 h-4 text-linear-accent/70 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm text-linear-text truncate">{{ item.name }}</p>
                    <p class="text-xs text-linear-text-secondary/50">标签 · {{ item.count }} 篇</p>
                  </div>
                </router-link>
                <router-link
                  v-else-if="item.type === 'collection'"
                  :to="`/collection/${encodeURIComponent(item.slug)}`"
                  class="flex items-center gap-3 px-3 py-2.5 hover:bg-linear-bg-tertiary transition-colors"
                >
                  <svg class="w-4 h-4 text-linear-accent/70 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm text-linear-text truncate">{{ item.name }}</p>
                    <p class="text-xs text-linear-text-secondary/50">合集 · {{ item.count }} 篇</p>
                  </div>
                </router-link>
                <router-link
                  v-else
                  :to="`/article/${item.article.slug}`"
                  class="flex items-center gap-3 px-3 py-2.5 hover:bg-linear-bg-tertiary transition-colors"
                >
                  <svg class="w-4 h-4 text-linear-text-secondary/50 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm text-linear-text truncate">{{ item.article.title }}</p>
                    <p class="text-xs text-linear-text-secondary/50">{{ item.article.tags?.[0] }} · {{ item.article.createdAt }}</p>
                  </div>
                </router-link>
              </template>
            </div>
          <div v-else class="px-4 py-6 text-center">
            <p class="text-sm text-linear-text-secondary/60">没有匹配的文档</p>
          </div>
        </div>
      </div>
    </Transition>
  </header>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}
.slide-down-enter-to,
.slide-down-leave-from {
  opacity: 1;
  max-height: 200px;
}
</style>
