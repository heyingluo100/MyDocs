<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTheme } from '../composables/useTheme.js'
import { useArticles } from '../composables/useArticles.js'
import { useClickOutside } from '../composables/useClickOutside.js'
import ThemeToggle from './ThemeToggle.vue'

const { theme } = useTheme()
const { articles } = useArticles()
const route = useRoute()
const router = useRouter()

const searchQuery = ref('')
const showMobileSearch = ref(false)
const searchWrapperRef = ref(null)

const searchResults = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return []
  return articles.value
    .filter(a => a.title.toLowerCase().includes(q))
    .slice(0, 8)
})

const hasQuery = computed(() => searchQuery.value.trim().length > 0)

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
              placeholder="搜索文档..."
              class="w-48 focus:w-64 pl-8 pr-3 py-1.5 text-sm bg-linear-bg-secondary border border-linear-border/50 rounded-lg text-linear-text placeholder:text-linear-text-secondary/50 focus:outline-none focus:border-linear-accent/50 transition-all duration-300"
            />
          </div>

          <!-- Search results dropdown -->
          <div
            v-if="hasQuery"
            class="absolute top-full left-0 right-0 mt-2 bg-linear-bg rounded-xl border border-linear-border/50 shadow-lg overflow-hidden z-30"
          >
            <div v-if="searchResults.length" class="max-h-80 overflow-y-auto py-1">
              <router-link
                v-for="article in searchResults"
                :key="article.slug"
                :to="`/article/${article.slug}`"
                class="flex items-center gap-3 px-3 py-2.5 hover:bg-linear-bg-tertiary transition-colors"
              >
                <svg class="w-4 h-4 text-linear-text-secondary/50 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div class="min-w-0 flex-1">
                  <p class="text-sm text-linear-text truncate">{{ article.title }}</p>
                  <p class="text-xs text-linear-text-secondary/50">{{ article.tags?.[0] }} · {{ article.createdAt }}</p>
                </div>
              </router-link>
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
            placeholder="搜索文档..."
            class="w-full pl-9 pr-3 py-2 text-sm bg-linear-bg-secondary border border-linear-border/50 rounded-xl text-linear-text placeholder:text-linear-text-secondary/50 focus:outline-none focus:border-linear-accent/50 transition-colors"
          />
        </div>

        <!-- Mobile search results -->
        <div v-if="hasQuery" class="mt-2 bg-linear-bg rounded-xl border border-linear-border/50 shadow-lg overflow-hidden">
          <div v-if="searchResults.length" class="max-h-64 overflow-y-auto py-1">
            <router-link
              v-for="article in searchResults"
              :key="article.slug"
              :to="`/article/${article.slug}`"
              class="flex items-center gap-3 px-3 py-2.5 hover:bg-linear-bg-tertiary transition-colors"
            >
              <svg class="w-4 h-4 text-linear-text-secondary/50 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div class="min-w-0 flex-1">
                <p class="text-sm text-linear-text truncate">{{ article.title }}</p>
                <p class="text-xs text-linear-text-secondary/50">{{ article.tags?.[0] }} · {{ article.createdAt }}</p>
              </div>
            </router-link>
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
