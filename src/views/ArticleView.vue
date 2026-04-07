<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useArticles } from '../composables/useArticles.js'
import { useReadHistory } from '../composables/useReadHistory.js'
import ArticleContent from '../components/ArticleContent.vue'

const route = useRoute()
const router = useRouter()
const { getArticleBySlug, decodeContent, articles, getAdjacentArticles } = useArticles()
const { hasUpdatedSinceLastRead, markAsRead } = useReadHistory()

// Dialog states
const showDeletedDialog = ref(false)
const showUpdatedDialog = ref(false)
const showTocDialog = ref(false)
const deletedTitle = ref('')

// 'realtime' = 正在看时后台改了, 'history' = 之前读过，再打开发现有更新
const updateReason = ref('')

// Frozen snapshot: what the user currently sees
const frozenContent = ref('')
const frozenArticle = ref(null)

// Pending article: when history update detected, store latest for user to accept
const pendingArticle = ref(null)

const article = computed(() => getArticleBySlug(route.params.slug))

// htmlContent reads from frozen snapshot
const htmlContent = computed(() => {
  if (!frozenContent.value) return ''
  return decodeContent(frozenContent.value)
})

// Route change: freeze new article or detect history update
watch(() => route.params.slug, (newSlug) => {
  if (!newSlug) return

  // Reset state
  showUpdatedDialog.value = false
  frozenContent.value = ''
  frozenArticle.value = null
  pendingArticle.value = null

  const current = getArticleBySlug(newSlug)
  if (!current) return

  // Check if user read this before and content has changed
  if (hasUpdatedSinceLastRead(newSlug, current.content)) {
    updateReason.value = 'history'
    pendingArticle.value = { ...current }
    showUpdatedDialog.value = true
    // Don't freeze yet — wait for user choice
  } else {
    // First time or no changes — display and record
    frozenContent.value = current.content
    frozenArticle.value = { ...current }
    markAsRead(newSlug, current.content)
  }
}, { immediate: true })

// Realtime: watch articles array for HMR/live updates on CURRENT article
watch(articles, () => {
  const slug = route.params.slug
  if (!slug) return
  const current = getArticleBySlug(slug)

  // Article deleted
  if (!current && frozenArticle.value) {
    deletedTitle.value = frozenArticle.value.title || slug
    showDeletedDialog.value = true
    return
  }

  if (!current) return

  // If we haven't frozen yet (waiting on history dialog), update pending
  if (!frozenContent.value && showUpdatedDialog.value) {
    pendingArticle.value = { ...current }
    return
  }

  // Realtime update: same article, content changed while viewing
  if (frozenContent.value && current.content !== frozenContent.value) {
    updateReason.value = 'realtime'
    pendingArticle.value = { ...current }
    showUpdatedDialog.value = true
  }
})

const handleConfirmDeleted = () => {
  showDeletedDialog.value = false
  router.push('/')
}

// "Yes" - show latest content
const handleRefreshNow = () => {
  showUpdatedDialog.value = false
  const latest = pendingArticle.value || article.value
  if (latest) {
    frozenContent.value = latest.content
    frozenArticle.value = { ...latest }
    markAsRead(latest.slug, latest.content)
  }
  pendingArticle.value = null
}

// "No" - keep old content (or skip if history)
const handleRefreshLater = () => {
  showUpdatedDialog.value = false
  // If history dialog and nothing frozen yet, still need to show something
  if (!frozenContent.value && pendingArticle.value) {
    frozenContent.value = pendingArticle.value.content
    frozenArticle.value = { ...pendingArticle.value }
    // Don't markAsRead — user chose "later", next visit will ask again
  }
  pendingArticle.value = null
}

// Display article: use frozen snapshot
const displayArticle = computed(() => frozenArticle.value)

// Adjacent articles for navigation
const adjacent = computed(() => {
  if (!displayArticle.value) return { prev: null, next: null, siblings: [] }
  return getAdjacentArticles(displayArticle.value.slug)
})
</script>

<template>
  <!-- Show snapshot content if user chose "later", otherwise show live content -->
  <div v-if="displayArticle" class="max-w-3xl mx-auto">
    <!-- Back button -->
    <router-link
      to="/"
      class="inline-flex items-center gap-2 text-sm text-linear-text-secondary hover:text-linear-text transition-colors mb-6"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 19l-7-7 7-7" />
      </svg>
      返回列表
    </router-link>

    <!-- Article header -->
    <header v-if="displayArticle" class="mb-8">
      <h1 class="text-2xl font-bold text-linear-text mb-3">{{ displayArticle.title }}</h1>
      <div class="flex items-center gap-3 flex-wrap">
        <span v-if="displayArticle.date" class="text-sm text-linear-text-secondary">
          {{ displayArticle.date }}
        </span>
        <span
          v-for="tag in displayArticle.tags"
          :key="tag"
          class="text-xs px-2 py-0.5 rounded-full bg-linear-bg-tertiary text-linear-text-secondary border border-linear-border/30"
        >
          {{ tag }}
        </span>
      </div>
    </header>

    <!-- Article content (protected) -->
    <ArticleContent :html="htmlContent" />

    <!-- Attached files -->
    <div v-if="displayArticle && displayArticle.files && displayArticle.files.length" class="mt-10 pt-6 border-t border-linear-border/50">
      <h3 class="text-sm font-semibold text-linear-text-secondary uppercase tracking-wider mb-3">
        附件文件
      </h3>
      <div class="space-y-2">
        <router-link
          v-for="file in displayArticle.files"
          :key="file"
          :to="`/file/${encodeURIComponent(file)}`"
          class="flex items-center gap-3 px-4 py-3 rounded-xl bg-linear-bg-secondary border border-linear-border/50 hover:bg-linear-bg-tertiary transition-colors"
        >
          <svg class="w-5 h-5 text-linear-text-secondary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span class="text-sm text-linear-text">{{ file }}</span>
        </router-link>
      </div>
    </div>

    <!-- Article navigation: prev / toc / next -->
    <nav v-if="adjacent.prev || adjacent.next || adjacent.siblings.length > 1" class="mt-10 pt-6 border-t border-linear-border/50">
      <div class="flex items-center justify-between gap-4">
        <!-- Prev -->
        <router-link
          v-if="adjacent.prev"
          :to="`/article/${adjacent.prev.slug}`"
          class="flex-1 min-w-0 flex items-center gap-2 px-4 py-3 rounded-xl bg-linear-bg-secondary border border-linear-border/50 hover:bg-linear-bg-tertiary transition-colors group"
        >
          <svg class="w-4 h-4 text-linear-text-secondary shrink-0 group-hover:text-linear-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 19l-7-7 7-7" />
          </svg>
          <div class="min-w-0">
            <p class="text-xs text-linear-text-secondary">上一篇</p>
            <p class="text-sm text-linear-text truncate group-hover:text-linear-accent transition-colors">{{ adjacent.prev.title }}</p>
          </div>
        </router-link>
        <div v-else class="flex-1"></div>

        <!-- TOC button -->
        <button
          v-if="adjacent.siblings.length > 1"
          @click="showTocDialog = true"
          class="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-linear-bg-secondary border border-linear-border/50 hover:bg-linear-bg-tertiary transition-colors text-linear-text-secondary hover:text-linear-accent"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          <span class="text-xs">目录</span>
        </button>

        <!-- Next -->
        <router-link
          v-if="adjacent.next"
          :to="`/article/${adjacent.next.slug}`"
          class="flex-1 min-w-0 flex items-center gap-2 px-4 py-3 rounded-xl bg-linear-bg-secondary border border-linear-border/50 hover:bg-linear-bg-tertiary transition-colors group justify-end text-right"
        >
          <div class="min-w-0">
            <p class="text-xs text-linear-text-secondary">下一篇</p>
            <p class="text-sm text-linear-text truncate group-hover:text-linear-accent transition-colors">{{ adjacent.next.title }}</p>
          </div>
          <svg class="w-4 h-4 text-linear-text-secondary shrink-0 group-hover:text-linear-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5l7 7-7 7" />
          </svg>
        </router-link>
        <div v-else class="flex-1"></div>
      </div>
    </nav>
  </div>

  <div v-else-if="!showDeletedDialog" class="text-center py-20">
    <p class="text-linear-text-secondary">文章不存在</p>
    <router-link to="/" class="text-linear-accent text-sm mt-2 inline-block">返回首页</router-link>
  </div>

  <!-- TOC dialog -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="showTocDialog" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showTocDialog = false"></div>
        <div class="relative bg-linear-bg rounded-2xl border border-linear-border/50 p-6 max-w-sm mx-4 shadow-xl w-full">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-semibold text-linear-text">
              {{ displayArticle?.tags?.[0] || '目录' }}
            </h3>
            <button @click="showTocDialog = false" class="p-1.5 rounded-lg hover:bg-linear-bg-tertiary transition-colors">
              <svg class="w-4 h-4 text-linear-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <nav class="space-y-1 max-h-80 overflow-y-auto">
            <router-link
              v-for="(item, i) in adjacent.siblings"
              :key="item.slug"
              :to="`/article/${item.slug}`"
              @click="showTocDialog = false"
              :class="[
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-300',
                item.slug === displayArticle?.slug
                  ? 'bg-linear-accent/10 text-linear-accent font-medium'
                  : 'text-linear-text-secondary hover:bg-linear-bg-tertiary hover:text-linear-text'
              ]"
            >
              <span class="text-xs text-linear-text-secondary/50 w-5 text-center shrink-0">{{ i + 1 }}</span>
              <span class="truncate">{{ item.title }}</span>
            </router-link>
          </nav>
        </div>
      </div>
    </Transition>

    <!-- Deleted dialog -->
    <Transition name="fade">
      <div v-if="showDeletedDialog" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        <div class="relative bg-linear-bg rounded-2xl border border-linear-border/50 p-6 max-w-sm mx-4 shadow-xl">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-semibold text-linear-text">文档已被删除</h3>
              <p class="text-sm text-linear-text-secondary mt-1">
                「{{ deletedTitle }}」已从文档库中移除
              </p>
            </div>
          </div>
          <button
            @click="handleConfirmDeleted"
            class="w-full py-2.5 rounded-xl bg-linear-accent text-white text-sm font-medium hover:bg-linear-accent-hover transition-colors"
          >
            确定，返回首页
          </button>
        </div>
      </div>
    </Transition>

    <!-- Updated dialog -->
    <Transition name="fade">
      <div v-if="showUpdatedDialog" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        <div class="relative bg-linear-bg rounded-2xl border border-linear-border/50 p-6 max-w-sm mx-4 shadow-xl">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-linear-accent/10 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5 text-linear-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-semibold text-linear-text">文档已更新</h3>
              <p class="text-sm text-linear-text-secondary mt-1">
                {{ updateReason === 'history'
                  ? '该文档自上次阅读后有更新，是否查看最新内容？'
                  : '当前文档内容已被修改，是否立即查看最新版本？' }}
              </p>
            </div>
          </div>
          <div class="flex gap-3">
            <button
              @click="handleRefreshLater"
              class="flex-1 py-2.5 rounded-xl bg-linear-bg-secondary border border-linear-border text-sm text-linear-text-secondary hover:bg-linear-bg-tertiary transition-colors"
            >
              稍后再看
            </button>
            <button
              @click="handleRefreshNow"
              class="flex-1 py-2.5 rounded-xl bg-linear-accent text-white text-sm font-medium hover:bg-linear-accent-hover transition-colors"
            >
              立即查看
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
