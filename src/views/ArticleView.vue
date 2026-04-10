<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useArticles } from '../composables/useArticles.js'
import { useReadHistory } from '../composables/useReadHistory.js'
import { useReadStatus } from '../composables/useReadStatus.js'
import { useReadingPrefs } from '../composables/useReadingPrefs.js'
import { useInvitation } from '../composables/useInvitation.js'
import ArticleContent from '../components/ArticleContent.vue'
import ArticleLockOverlay from '../components/ArticleLockOverlay.vue'

// Reading progress + sticky bar + position saving
const readingProgress = ref(0)
const showStickyBar = ref(false)
const headerRef = ref(null)
const currentSlug = ref('')
let lastSaveTime = 0
const updateProgress = () => {
  const scrollTop = window.scrollY
  const docHeight = document.documentElement.scrollHeight - window.innerHeight
  readingProgress.value = docHeight > 0 ? Math.min(Math.round((scrollTop / docHeight) * 100), 100) : 0
  // Show sticky bar when article header scrolls out of viewport
  if (headerRef.value) {
    showStickyBar.value = headerRef.value.getBoundingClientRect().bottom < 0
  }
  // Throttled position save (every 3s)
  const now = Date.now()
  if (now - lastSaveTime > 3000 && currentSlug.value) {
    lastSaveTime = now
    saveReadingPosition(currentSlug.value, readingProgress.value)
  }
}
onMounted(() => window.addEventListener('scroll', updateProgress, { passive: true }))
onBeforeUnmount(() => {
  window.removeEventListener('scroll', updateProgress)
  document.body.style.overflow = ''
  // Save position on leave (use currentSlug, not route — route has already changed)
  if (currentSlug.value) {
    saveReadingPosition(currentSlug.value, readingProgress.value)
  }
})

const route = useRoute()
const router = useRouter()
const { getArticleBySlug, decodeContent, articles, getAdjacentArticles, sortBy } = useArticles()
const { hasUpdatedSinceLastRead, markAsRead, saveReadingPosition, getReadingPosition, clearReadingPosition } = useReadHistory()
const { markAsRead: markStatusRead } = useReadStatus()
const { checkArticleAccess } = useInvitation()

// Article lock state
const articleUnlocked = ref(true)

// Dialog states
const showDeletedDialog = ref(false)
const showUpdatedDialog = ref(false)
const showTocDialog = ref(false)
const showContinueDialog = ref(false)
const showLockedNavDialog = ref(false)
const pendingNavTarget = ref(null)
const savedProgress = ref(0)
const deletedTitle = ref('')

// Mobile reading overlay menu
const { FONT_SIZES, currentSize } = useReadingPrefs()
const showReadingMenu = ref(false)
const contentAreaRef = ref(null)

let touchStartY = 0
let touchStartX = 0
let touchStartTime = 0
let touchMoved = false

const handleTouchStart = (e) => {
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
  touchStartTime = Date.now()
  touchMoved = false
}

const handleTouchMove = (e) => {
  // Only count as "moved" if finger travels more than 10px (tolerates slight jitter)
  if (!touchMoved) {
    const dx = e.touches[0].clientX - touchStartX
    const dy = e.touches[0].clientY - touchStartY
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      touchMoved = true
    }
  }
}

const handleTouchEnd = (e) => {
  // Ignore if scrolled or long press (500ms threshold)
  if (touchMoved || Date.now() - touchStartTime > 500) return
  // Only on mobile (<1024px)
  if (window.innerWidth >= 1024) return
  // Ignore taps on interactive elements
  if (e.target.closest('a, button, input, [role="button"], form')) return
  const rect = contentAreaRef.value?.getBoundingClientRect()
  if (!rect) return
  // Use viewport height — tap in middle 4/5 of screen triggers menu (exclude top/bottom 1/10)
  const viewportHeight = window.innerHeight
  const margin = viewportHeight / 10
  if (touchStartY > margin && touchStartY < viewportHeight - margin) {
    e.preventDefault()
    showReadingMenu.value = !showReadingMenu.value
  }
}

const handleContentTap = (e) => {
  // Desktop fallback only (mobile uses touchend)
  if (window.innerWidth < 1024) return
}

watch(showReadingMenu, (val) => {
  document.body.style.overflow = val ? 'hidden' : ''
})

// TOC 弹出层打开时锁定背景滚动
watch(showTocDialog, (val) => {
  document.body.style.overflow = val ? 'hidden' : ''
})

watch(showLockedNavDialog, (val) => {
  document.body.style.overflow = val ? 'hidden' : ''
})

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

// Track whether this is the initial page load (refresh) or SPA navigation
let isInitialLoad = true

// Track which tag context the user came from (for correct siblings navigation)
// Uses sessionStorage so it persists across page navigations
const navContextTag = ref(sessionStorage.getItem('nav-context-tag') || '')

// Route change: freeze new article or detect history update
watch(() => route.params.slug, (newSlug, oldSlug) => {
  // Save position of previous article before switching
  if (oldSlug && readingProgress.value > 0) {
    saveReadingPosition(oldSlug, readingProgress.value)
  }

  if (!newSlug) return
  currentSlug.value = newSlug

  // Reset state
  showUpdatedDialog.value = false
  showContinueDialog.value = false
  savedProgress.value = 0
  frozenContent.value = ''
  frozenArticle.value = null
  pendingArticle.value = null
  articleUnlocked.value = true

  const current = getArticleBySlug(newSlug)
  if (!current) return

  // Check article lock
  if (current.locked && current.lockHash) {
    articleUnlocked.value = checkArticleAccess(newSlug, current.lockHash)
    if (!articleUnlocked.value) {
      // Still freeze the article metadata (for title display), but content stays locked
      frozenArticle.value = { ...current }
      frozenContent.value = current.content
      isInitialLoad = false
      return
    }
  }

  // On SPA navigation (not page refresh), check history for updates
  if (!isInitialLoad && hasUpdatedSinceLastRead(newSlug, current.content)) {
    updateReason.value = 'history'
    pendingArticle.value = { ...current }
    showUpdatedDialog.value = true
    // Content changed — old position is meaningless
    clearReadingPosition(newSlug)
  } else {
    // Page refresh, first visit, or no changes — show latest directly
    frozenContent.value = current.content
    frozenArticle.value = { ...current }
    markAsRead(newSlug, current.content)
    markStatusRead(newSlug)

    // Check for saved reading position
    const pos = getReadingPosition(newSlug)
    if (pos) {
      savedProgress.value = pos
      showContinueDialog.value = true
    }
  }
  isInitialLoad = false
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

  // First load: articles just arrived from fetch — always show latest (this is a page refresh)
  if (!frozenContent.value && !frozenArticle.value) {
    // Check article lock on first load too
    if (current.locked && current.lockHash) {
      articleUnlocked.value = checkArticleAccess(slug, current.lockHash)
      if (!articleUnlocked.value) {
        frozenArticle.value = { ...current }
        frozenContent.value = current.content
        return
      }
    }
    frozenContent.value = current.content
    frozenArticle.value = { ...current }
    markAsRead(slug, current.content)
    return
  }

  // Realtime update: same article, content changed while viewing
  if (frozenContent.value && current.content !== frozenContent.value) {
    updateReason.value = 'realtime'
    pendingArticle.value = { ...current }
    showUpdatedDialog.value = true
  }
})

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}

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

// Continue reading: scroll to saved position
const handleContinueReading = () => {
  showContinueDialog.value = false
  nextTick(() => {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight
    const targetY = Math.round((savedProgress.value / 100) * docHeight)
    window.scrollTo({ top: targetY, behavior: 'smooth' })
  })
  if (route.params.slug) clearReadingPosition(route.params.slug)
}

// Start from beginning
const handleStartFresh = () => {
  showContinueDialog.value = false
  if (route.params.slug) clearReadingPosition(route.params.slug)
}

// Article unlock: after entering correct code, initialize normal reading flow
const handleArticleUnlocked = () => {
  articleUnlocked.value = true
  const slug = route.params.slug
  const current = getArticleBySlug(slug)
  if (current) {
    markAsRead(slug, current.content)
    markStatusRead(slug)
    const pos = getReadingPosition(slug)
    if (pos) {
      savedProgress.value = pos
      showContinueDialog.value = true
    }
  }
}

// Navigation: check lock before jumping
const handleNavTo = (target) => {
  if (target.locked && target.lockHash && !checkArticleAccess(target.slug, target.lockHash)) {
    pendingNavTarget.value = target
    showLockedNavDialog.value = true
  } else {
    router.replace(`/article/${target.slug}`)
  }
}

const handleNavConfirm = () => {
  showLockedNavDialog.value = false
  if (pendingNavTarget.value) {
    router.replace(`/article/${pendingNavTarget.value.slug}`)
    pendingNavTarget.value = null
  }
}

const handleNavCancel = () => {
  showLockedNavDialog.value = false
  pendingNavTarget.value = null
}

// Display article: use frozen snapshot
const displayArticle = computed(() => frozenArticle.value)

// Adjacent articles for navigation (sorted to match homepage)
const adjacent = computed(() => {
  if (!displayArticle.value) return { prev: null, next: null, siblings: [] }
  const result = getAdjacentArticles(displayArticle.value.slug, navContextTag.value)
  const ctxTag = navContextTag.value
  // Sort siblings: pinned first, then by date
  const sorted = [...result.siblings].sort((a, b) => {
    const aGlobalPin = a.pinned && !a.pinTag
    const bGlobalPin = b.pinned && !b.pinTag
    const aTagPin = a.pinned && a.pinTag && a.pinTag === ctxTag
    const bTagPin = b.pinned && b.pinTag && b.pinTag === ctxTag
    const aPinned = aGlobalPin || aTagPin
    const bPinned = bGlobalPin || bTagPin
    if (aPinned && !bPinned) return -1
    if (!aPinned && bPinned) return 1
    if (aPinned && bPinned) {
      if (aGlobalPin && !bGlobalPin) return -1
      if (!aGlobalPin && bGlobalPin) return 1
      return a.pinOrder - b.pinOrder
    }
    const dateA = sortBy.value === 'updated' ? (a.updatedAt || a.createdAt) : a.createdAt
    const dateB = sortBy.value === 'updated' ? (b.updatedAt || b.createdAt) : b.createdAt
    return dateB.localeCompare(dateA)
  })
  const index = sorted.findIndex(a => a.slug === displayArticle.value.slug)
  return {
    prev: index > 0 ? sorted[index - 1] : null,
    next: index < sorted.length - 1 ? sorted[index + 1] : null,
    siblings: sorted
  }
})
</script>

<template>
  <div>
  <!-- Reading progress bar -->
  <div
    v-if="displayArticle"
    class="fixed top-0 left-0 z-50 h-0.5 bg-linear-accent transition-[width] duration-150 ease-out"
    :style="{ width: readingProgress + '%' }"
  ></div>

  <!-- Sticky mini bar (appears when header scrolls out) -->
  <Transition name="sticky-bar">
    <div
      v-if="showStickyBar && displayArticle"
      class="fixed top-0 left-0 right-0 z-40 bg-linear-bg/80 backdrop-blur-md border-b border-linear-border/30 shadow-sm"
    >
      <div class="max-w-7xl mx-auto px-6 h-12 flex items-center gap-3">
        <!-- Back button -->
        <a
          href="#"
          @click.prevent="goBack"
          class="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 -ml-2.5 rounded-lg text-linear-text-secondary hover:text-linear-text hover:bg-linear-bg-tertiary transition-all duration-300"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 19l-7-7 7-7" />
          </svg>
          <span class="text-xs">返回</span>
        </a>

        <!-- Divider -->
        <div class="w-px h-4 bg-linear-border/50 shrink-0"></div>

        <!-- Title -->
        <span class="text-sm font-medium text-linear-text truncate flex-1">{{ displayArticle.title }}</span>

        <!-- Progress percentage -->
        <span class="shrink-0 text-xs tabular-nums text-linear-text-secondary/70">{{ readingProgress }}%</span>
      </div>
    </div>
  </Transition>

  <!-- Show snapshot content if user chose "later", otherwise show live content -->
  <div v-if="displayArticle" ref="contentAreaRef" class="max-w-3xl mx-auto" @click="handleContentTap" @touchstart.passive="handleTouchStart" @touchmove.passive="handleTouchMove" @touchend="handleTouchEnd">
    <!-- Back button -->
    <a
      href="#"
      @click.prevent="goBack"
      class="inline-flex items-center gap-2 text-sm text-linear-text-secondary hover:text-linear-text transition-colors mb-6"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 19l-7-7 7-7" />
      </svg>
      返回列表
    </a>

    <!-- Article header -->
    <header ref="headerRef" v-if="displayArticle" class="mb-8">
      <h1 class="text-2xl font-bold text-linear-text mb-3">{{ displayArticle.title }}</h1>
      <div class="flex items-center gap-3 flex-wrap">
        <span v-if="displayArticle.createdAt" class="text-sm text-linear-text-secondary">
          创建于 {{ displayArticle.createdAt }}
        </span>
        <span v-if="displayArticle.updatedAt && displayArticle.updatedAt !== displayArticle.createdAt" class="text-sm text-linear-text-secondary">
          · 更新于 {{ displayArticle.updatedAt }}
        </span>
        <span v-if="displayArticle.wordCount" class="text-sm text-linear-text-secondary">
          · {{ displayArticle.wordCount >= 10000 ? (displayArticle.wordCount / 10000).toFixed(1) + '万' : displayArticle.wordCount }} 字
        </span>
        <span
          v-for="tag in displayArticle.tags"
          :key="tag"
          class="text-xs px-2 py-0.5 rounded-full bg-linear-bg-tertiary text-linear-text-secondary border border-linear-border/30"
        >
          {{ tag }}
        </span>
        <router-link
          v-if="displayArticle.collection"
          :to="`/collection/${encodeURIComponent(displayArticle.collectionSlug)}`"
          class="text-xs px-2 py-0.5 rounded-full bg-linear-accent/10 text-linear-accent border border-linear-accent/20 hover:bg-linear-accent/20 transition-colors"
        >
          {{ displayArticle.collection }}
        </router-link>
      </div>
    </header>

    <!-- Article lock overlay -->
    <ArticleLockOverlay
      v-if="displayArticle?.locked && !articleUnlocked"
      :title="displayArticle.title"
      :lock-hash="displayArticle.lockHash"
      :slug="displayArticle.slug"
      @unlocked="handleArticleUnlocked"
    />

    <!-- Article content (protected) — hidden when locked -->
    <template v-if="articleUnlocked">
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
    </template>

    <!-- Article navigation: always visible (even when locked) -->
    <nav v-if="adjacent.prev || adjacent.next || adjacent.siblings.length > 1" class="mt-10 pt-6 border-t border-linear-border/50">
      <div class="flex items-center justify-between gap-4">
        <!-- Prev -->
        <div v-if="adjacent.prev" class="flex-1 min-w-0">
          <a
            href="#"
            @click.prevent="handleNavTo(adjacent.prev)"
            class="flex items-center gap-2 px-4 py-3 rounded-xl bg-linear-bg-secondary border border-linear-border/50 hover:bg-linear-bg-tertiary transition-colors group"
          >
            <svg class="w-4 h-4 text-linear-text-secondary shrink-0 group-hover:text-linear-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 19l-7-7 7-7" />
            </svg>
            <div class="min-w-0">
              <p class="text-xs text-linear-text-secondary">上一篇</p>
              <p class="text-sm text-linear-text truncate group-hover:text-linear-accent transition-colors flex items-center gap-1">
                <svg v-if="adjacent.prev.locked && !checkArticleAccess(adjacent.prev.slug, adjacent.prev.lockHash)" class="w-3 h-3 text-amber-500/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                <svg v-else-if="adjacent.prev.locked" class="w-3 h-3 text-linear-success/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                {{ adjacent.prev.title }}
              </p>
            </div>
          </a>
        </div>
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
        <div v-if="adjacent.next" class="flex-1 min-w-0">
          <a
            href="#"
            @click.prevent="handleNavTo(adjacent.next)"
            class="flex items-center gap-2 px-4 py-3 rounded-xl bg-linear-bg-secondary border border-linear-border/50 hover:bg-linear-bg-tertiary transition-colors group justify-end text-right"
          >
            <div class="min-w-0">
              <p class="text-xs text-linear-text-secondary">下一篇</p>
              <p class="text-sm text-linear-text truncate group-hover:text-linear-accent transition-colors flex items-center justify-end gap-1">
                {{ adjacent.next.title }}
                <svg v-if="adjacent.next.locked && !checkArticleAccess(adjacent.next.slug, adjacent.next.lockHash)" class="w-3 h-3 text-amber-500/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                <svg v-else-if="adjacent.next.locked" class="w-3 h-3 text-linear-success/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
              </p>
            </div>
            <svg class="w-4 h-4 text-linear-text-secondary shrink-0 group-hover:text-linear-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
        <div v-else class="flex-1"></div>
      </div>
    </nav>
  </div>

  <div v-else-if="!showDeletedDialog" class="text-center py-20">
    <p class="text-linear-text-secondary">文章不存在</p>
    <router-link to="/" class="text-linear-accent text-sm mt-2 inline-block">返回首页</router-link>
  </div>

  <!-- Mobile reading overlay menu -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="showReadingMenu" class="fixed inset-0 z-50 lg:hidden" @click.self="showReadingMenu = false">
        <!-- Top bar: back + font size -->
        <div class="reading-menu-top absolute top-0 inset-x-0 bg-linear-bg/95 backdrop-blur-md border-b border-linear-border/30 safe-area-top">
          <div class="flex items-center gap-3 px-6 py-4">
            <button
              @click="showReadingMenu = false; goBack()"
              class="flex items-center gap-1.5 px-2.5 py-1.5 -ml-2.5 rounded-lg text-linear-text-secondary active:bg-linear-bg-tertiary transition-colors shrink-0"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div class="flex items-center justify-center gap-2 flex-1">
              <button
                v-for="size in FONT_SIZES"
                :key="size.key"
                @click="currentSize = size.key"
                class="flex items-center justify-center min-w-[3rem] px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200"
                :class="currentSize === size.key
                  ? 'bg-linear-accent text-white'
                  : 'bg-linear-bg-secondary text-linear-text-secondary border border-linear-border/50 hover:bg-linear-bg-tertiary'"
              >
                {{ size.label }}
              </button>
            </div>
          </div>
        </div>

        <!-- Bottom bar: navigation -->
        <div class="reading-menu-bottom absolute bottom-0 inset-x-0 bg-linear-bg/95 backdrop-blur-md border-t border-linear-border/30 safe-area-bottom">
          <div class="px-6 pt-3 pb-2">
            <!-- Nav row -->
            <div class="flex items-center justify-around mb-2">
              <button
                @click="showReadingMenu = false; adjacent.prev && handleNavTo(adjacent.prev)"
                :disabled="!adjacent.prev"
                class="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors"
                :class="adjacent.prev ? 'text-linear-text-secondary active:bg-linear-bg-tertiary' : 'text-linear-text-secondary/30'"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 19l-7-7 7-7" />
                </svg>
                <span class="text-xs">上一章</span>
              </button>

              <button
                @click="showReadingMenu = false; showTocDialog = true"
                :disabled="adjacent.siblings.length <= 1"
                class="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors"
                :class="adjacent.siblings.length > 1 ? 'text-linear-text-secondary active:bg-linear-bg-tertiary' : 'text-linear-text-secondary/30'"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <span class="text-xs">目录</span>
              </button>

              <button
                @click="showReadingMenu = false; adjacent.next && handleNavTo(adjacent.next)"
                :disabled="!adjacent.next"
                class="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors"
                :class="adjacent.next ? 'text-linear-text-secondary active:bg-linear-bg-tertiary' : 'text-linear-text-secondary/30'"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5l7 7-7 7" />
                </svg>
                <span class="text-xs">下一章</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- TOC bottom sheet -->
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition name="fade">
      <div v-if="showTocDialog" class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" @click="showTocDialog = false"></div>
    </Transition>
    <!-- Panel -->
    <Transition name="slide-up">
      <div v-if="showTocDialog" class="fixed inset-x-0 bottom-0 z-50">
        <div class="bg-linear-bg rounded-t-2xl border-t border-linear-border/50 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] pb-6">
          <!-- Drag indicator -->
          <div class="flex justify-center pt-3 pb-2">
            <div class="w-10 h-1 rounded-full bg-linear-text-secondary/30"></div>
          </div>
          <div class="flex items-center justify-between px-6 mb-3">
            <h3 class="text-base font-semibold text-linear-text">
              {{ displayArticle?.collection || displayArticle?.tags?.[0] || '目录' }}
            </h3>
            <div class="flex items-center gap-2">
              <button
                @click="sortBy = sortBy === 'created' ? 'updated' : 'created'"
                class="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-linear-text-secondary hover:bg-linear-bg-tertiary transition-colors"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7h18M3 12h12M3 17h6" />
                </svg>
                {{ sortBy === 'updated' ? '最近更新' : '最新创建' }}
              </button>
              <button @click="showTocDialog = false" class="p-1.5 rounded-lg hover:bg-linear-bg-tertiary transition-colors">
                <svg class="w-4 h-4 text-linear-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <nav class="space-y-1 max-h-[60vh] overflow-y-auto px-4">
            <a
              v-for="(item, i) in adjacent.siblings"
              :key="item.slug"
              href="#"
              @click.prevent="showTocDialog = false; item.slug === displayArticle?.slug ? null : handleNavTo(item)"
              :class="[
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-300 cursor-pointer',
                item.slug === displayArticle?.slug
                  ? 'bg-linear-accent/10 text-linear-accent font-medium'
                  : 'text-linear-text-secondary hover:bg-linear-bg-tertiary hover:text-linear-text'
              ]"
            >
              <span class="text-xs text-linear-text-secondary/50 w-5 text-center shrink-0">{{ i + 1 }}</span>
              <svg v-if="item.pinned" class="w-3 h-3 text-linear-accent/60 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 3a1 1 0 011.447.894l.553 5.53 2.553 1.277A1 1 0 0120 12.618V14a1 1 0 01-1 1h-5v6l-1 2-1-2v-6H7a1 1 0 01-1-1v-1.382a1 1 0 01-.447-.894L6 11.618l2.553-1.276L9.106 4.81A1 1 0 0110 4h6z" />
              </svg>
              <span class="truncate flex-1">{{ item.title }}</span>
              <!-- Locked: show lock/unlock icon -->
              <svg v-if="item.locked && !checkArticleAccess(item.slug, item.lockHash)" class="w-3.5 h-3.5 text-amber-500/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              <svg v-else-if="item.locked" class="w-3.5 h-3.5 text-linear-success/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </a>
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

    <!-- Continue reading dialog -->
    <Transition name="fade">
      <div v-if="showContinueDialog" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        <div class="relative bg-linear-bg rounded-2xl border border-linear-border/50 p-6 max-w-sm mx-4 shadow-xl">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-linear-accent/10 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5 text-linear-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-semibold text-linear-text">继续阅读</h3>
              <p class="text-sm text-linear-text-secondary mt-1">
                上次阅读到 {{ savedProgress }}%，是否跳转到上次位置？
              </p>
            </div>
          </div>
          <div class="flex gap-3">
            <button
              @click="handleStartFresh"
              class="flex-1 py-2.5 rounded-xl bg-linear-bg-secondary border border-linear-border text-sm text-linear-text-secondary hover:bg-linear-bg-tertiary transition-colors"
            >
              从头开始
            </button>
            <button
              @click="handleContinueReading"
              class="flex-1 py-2.5 rounded-xl bg-linear-accent text-white text-sm font-medium hover:bg-linear-accent-hover transition-colors"
            >
              继续阅读
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Locked article navigation dialog -->
    <Transition name="fade">
      <div v-if="showLockedNavDialog" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="handleNavCancel"></div>
        <div class="relative bg-linear-bg rounded-2xl border border-linear-border/50 p-6 max-w-sm mx-4 shadow-xl">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-semibold text-linear-text">文章已锁定</h3>
              <p class="text-sm text-linear-text-secondary mt-1">
                「{{ pendingNavTarget?.title }}」需要邀请码才能查看，是否前往？
              </p>
            </div>
          </div>
          <div class="flex gap-3">
            <button
              @click="handleNavCancel"
              class="flex-1 py-2.5 rounded-xl bg-linear-bg-secondary border border-linear-border text-sm text-linear-text-secondary hover:bg-linear-bg-tertiary transition-colors"
            >
              取消
            </button>
            <button
              @click="handleNavConfirm"
              class="flex-1 py-2.5 rounded-xl bg-linear-accent text-white text-sm font-medium hover:bg-linear-accent-hover transition-colors"
            >
              前往
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
  </div>
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
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}
.sticky-bar-enter-active,
.sticky-bar-leave-active {
  transition: transform 0.3s ease;
}
.sticky-bar-enter-from,
.sticky-bar-leave-to {
  transform: translateY(-100%);
}

/* Reading menu bars slide in */
.fade-enter-active .reading-menu-top,
.fade-enter-active .reading-menu-bottom {
  transition: transform 0.3s ease;
}
.fade-leave-active .reading-menu-top,
.fade-leave-active .reading-menu-bottom {
  transition: transform 0.2s ease;
}
.fade-enter-from .reading-menu-top,
.fade-leave-to .reading-menu-top {
  transform: translateY(-100%);
}
.fade-enter-from .reading-menu-bottom,
.fade-leave-to .reading-menu-bottom {
  transform: translateY(100%);
}

/* Safe area padding for notched devices */
.safe-area-top { padding-top: env(safe-area-inset-top); }
.safe-area-bottom { padding-bottom: env(safe-area-inset-bottom); }
</style>
