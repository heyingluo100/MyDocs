<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useArticles } from '../composables/useArticles.js'
import ArticleContent from '../components/ArticleContent.vue'

const route = useRoute()
const router = useRouter()
const { getArticleBySlug, decodeContent, articles } = useArticles()

// Dialog states
const showDeletedDialog = ref(false)
const showUpdatedDialog = ref(false)
const deletedTitle = ref('')

// Frozen snapshot: what the user currently sees
const frozenContent = ref('')
const frozenArticle = ref(null)

const article = computed(() => getArticleBySlug(route.params.slug))

// htmlContent reads from frozen snapshot, not live data
const htmlContent = computed(() => {
  if (!frozenContent.value) return ''
  return decodeContent(frozenContent.value)
})

// Track article changes
let hadArticle = false
watch(article, (newVal, oldVal) => {
  // Article deleted
  if (hadArticle && !newVal && oldVal) {
    deletedTitle.value = oldVal.title || route.params.slug
    showDeletedDialog.value = true
    return
  }

  // First load: freeze initial content
  if (newVal && !hadArticle) {
    hadArticle = true
    frozenContent.value = newVal.content
    frozenArticle.value = { ...newVal }
    return
  }

  // Article content changed while viewing
  if (newVal && hadArticle && newVal.content !== frozenContent.value) {
    showUpdatedDialog.value = true
  }
}, { immediate: true })

// Also watch the articles array for deep changes (HMR pushes new array)
watch(articles, () => {
  const current = getArticleBySlug(route.params.slug)
  if (!current && hadArticle) {
    deletedTitle.value = frozenArticle.value?.title || route.params.slug
    showDeletedDialog.value = true
  } else if (current && hadArticle && current.content !== frozenContent.value) {
    showUpdatedDialog.value = true
  }
})

const handleConfirmDeleted = () => {
  showDeletedDialog.value = false
  router.push('/')
}

// "Yes" - refresh content now
const handleRefreshNow = () => {
  showUpdatedDialog.value = false
  frozenContent.value = article.value?.content || ''
  frozenArticle.value = article.value ? { ...article.value } : null
}

// "No" - keep current view, will see new content next time
const handleRefreshLater = () => {
  showUpdatedDialog.value = false
}

// Display article: use frozen snapshot
const displayArticle = computed(() => frozenArticle.value)
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
  </div>

  <div v-else-if="!showDeletedDialog" class="text-center py-20">
    <p class="text-linear-text-secondary">文章不存在</p>
    <router-link to="/" class="text-linear-accent text-sm mt-2 inline-block">返回首页</router-link>
  </div>

  <!-- Deleted dialog -->
  <Teleport to="body">
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
                当前文档内容已被修改，是否立即查看最新版本？
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
