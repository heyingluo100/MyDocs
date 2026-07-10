<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useArticles } from '../composables/useArticles.js'
import TagBottomSheet from '../components/TagBottomSheet.vue'
import ArticleCard from '../components/ArticleCard.vue'
import CollectionCard from '../components/CollectionCard.vue'
import ReaderGuideBanner from '../components/ReaderGuideBanner.vue'

const route = useRoute()
const { getArticlesByTag, allCollections, sortBy, loaded, loadError, readerGuide } = useArticles()
const showMobileSheet = ref(false)
const showSortMenu = ref(false)

// 排序方向：'desc'=正序（最新在前，现有默认），'asc'=倒序（最早在前）。组件级，不跨页共享
const sortDir = ref('desc')

const SORT_OPTIONS = [
  { by: 'added', dir: 'desc', label: '最近加入' },
  { by: 'added', dir: 'asc', label: '最早加入' },
  { by: 'updated', dir: 'desc', label: '最近更新' },
  { by: 'updated', dir: 'asc', label: '最早更新' }
]

const sortLabel = computed(() =>
  SORT_OPTIONS.find(o => o.by === sortBy.value && o.dir === sortDir.value)?.label || '最近加入'
)

const isCurrentSort = (o) => o.by === sortBy.value && o.dir === sortDir.value

const handleSort = (o) => {
  sortBy.value = o.by
  sortDir.value = o.dir
  showSortMenu.value = false
}

const currentTag = computed(() => {
  return route.params.tag ? decodeURIComponent(route.params.tag) : ''
})

// Save current tag context for article navigation
watch(currentTag, (tag) => {
  sessionStorage.setItem('nav-context-tag', tag)
}, { immediate: true })

const filteredArticles = computed(() => {
  return getArticlesByTag(currentTag.value)
})

// Build mixed list: standalone articles + collection groups
const mixedItems = computed(() => {
  const articles = filteredArticles.value
  const items = []

  const standaloneArticles = articles.filter(a => !a.collectionSlug)

  const relevantCollections = currentTag.value
    ? allCollections.value.filter(c => (c.tags || [c.tag]).includes(currentTag.value))
    : allCollections.value

  for (const col of relevantCollections) {
    const colArticles = articles.filter(a => a.collectionSlug === col.slug)
    if (colArticles.length === 0) continue
    const pickDate = (a) => {
      if (sortBy.value === 'updated') return a.updatedAt || a.addedAt || a.createdAt || ''
      return a.addedAt || a.createdAt || ''
    }
    const sortDate = colArticles.reduce((max, a) => {
      const d = pickDate(a)
      return d > max ? d : max
    }, pickDate(colArticles[0]))
    items.push({ type: 'collection', collection: col, articles: colArticles, sortDate })
  }

  for (const article of standaloneArticles) {
    const sortDate = sortBy.value === 'updated'
      ? (article.updatedAt || article.addedAt || article.createdAt || '')
      : (article.addedAt || article.createdAt || '')
    items.push({ type: 'article', article, sortDate })
  }

  const tag = currentTag.value
  items.sort((a, b) => {
    const aData = a.type === 'collection' ? a.collection : a.article
    const bData = b.type === 'collection' ? b.collection : b.article
    const aGlobalPin = aData.pinned && !aData.pinTag
    const bGlobalPin = bData.pinned && !bData.pinTag
    const aTagPin = aData.pinned && aData.pinTag && aData.pinTag === tag
    const bTagPin = bData.pinned && bData.pinTag && bData.pinTag === tag
    const aPinned = aGlobalPin || aTagPin
    const bPinned = bGlobalPin || bTagPin
    if (aPinned && !bPinned) return -1
    if (!aPinned && bPinned) return 1
    if (aPinned && bPinned) {
      if (aGlobalPin && !bGlobalPin) return -1
      if (!aGlobalPin && bGlobalPin) return 1
      return aData.pinOrder - bData.pinOrder
    }
    // 方向只作用于非置顶的日期排序：desc=最新在前，asc=最早在前
    return sortDir.value === 'asc'
      ? a.sortDate.localeCompare(b.sortDate)
      : b.sortDate.localeCompare(a.sortDate)
  })

  return items
})

const totalCount = computed(() => filteredArticles.value.length)
</script>

<template>
  <div>
    <!-- Article list -->
    <div class="flex-1 min-w-0">
      <!-- Reader guide banner (homepage only, no tag filter) -->
      <ReaderGuideBanner v-if="!currentTag && readerGuide" :html="readerGuide" />

      <div class="flex items-center gap-2 sm:gap-3 mb-4 flex-nowrap">
        <h1 class="text-xl font-bold text-linear-text truncate min-w-0">
          {{ currentTag || '全部文档' }}
        </h1>
        <span class="text-sm text-linear-text-secondary shrink-0 whitespace-nowrap">
          {{ totalCount }} 篇
        </span>

        <div class="ml-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
          <!-- Sort dropdown -->
          <div class="relative shrink-0">
            <button
              class="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full text-sm border transition-all duration-300 bg-linear-bg-secondary text-linear-text-secondary border-linear-border hover:bg-linear-bg-tertiary whitespace-nowrap"
              @click="showSortMenu = !showSortMenu"
            >
              <!-- 移动端：只显示排序图标 -->
              <svg class="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7h13M3 12h9m-9 5h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
              <!-- 桌面端：显示文字 -->
              <span class="hidden sm:inline">{{ sortLabel }}</span>
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
                  v-for="o in SORT_OPTIONS"
                  :key="o.by + '-' + o.dir"
                  class="w-full flex items-center justify-between gap-3 px-3 py-2 text-sm transition-colors hover:bg-linear-bg-tertiary whitespace-nowrap"
                  :class="isCurrentSort(o) ? 'text-linear-accent' : 'text-linear-text'"
                  @click="handleSort(o)"
                >
                  {{ o.label }}
                  <svg v-if="isCurrentSort(o)" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            class="lg:hidden flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-sm border transition-all duration-300 bg-linear-bg-secondary text-linear-text-secondary border-linear-border hover:bg-linear-bg-tertiary shrink-0 whitespace-nowrap"
            @click="showMobileSheet = true"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span class="hidden sm:inline">分类</span>
          </button>
        </div>
      </div>

      <div v-if="mixedItems.length" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <template v-for="item in mixedItems" :key="item.type === 'article' ? item.article.slug : item.collection.slug">
          <ArticleCard v-if="item.type === 'article'" :article="item.article" />
          <CollectionCard v-else :collection="item.collection" :articles="item.articles" />
        </template>
      </div>

      <!-- 加载失败提示 -->
      <div v-else-if="loaded && loadError" class="text-center py-20">
        <svg class="w-12 h-12 text-red-400/60 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p class="text-linear-text-secondary mb-3">文档列表加载失败</p>
        <button
          @click="() => location.reload()"
          class="text-sm text-linear-accent hover:text-linear-accent-hover transition-colors"
        >
          点击重试
        </button>
      </div>

      <!-- 加载中 -->
      <div v-else-if="!loaded" class="text-center py-20">
        <div class="animate-spin w-6 h-6 border-2 border-linear-border border-t-linear-accent rounded-full mx-auto"></div>
      </div>

      <div v-else class="text-center py-20">
        <p class="text-linear-text-secondary">暂无文档</p>
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
