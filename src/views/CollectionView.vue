<script setup>
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useArticles } from '../composables/useArticles.js'
import { useReadStatus } from '../composables/useReadStatus.js'
import ArticleCard from '../components/ArticleCard.vue'

const route = useRoute()
const router = useRouter()
const { getArticlesByCollection, getCollectionBySlug } = useArticles()
const { markCollectionAsRead } = useReadStatus()

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}

const collectionSlug = computed(() => decodeURIComponent(route.params.slug || ''))
const collection = computed(() => getCollectionBySlug(collectionSlug.value))
const collectionArticles = computed(() => {
  const articles = getArticlesByCollection(collectionSlug.value)
  return [...articles].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    if (a.pinned && b.pinned) return a.pinOrder - b.pinOrder
    return 0 // preserve original order (filename sort from build)
  })
})

// Mark collection as read on enter
watch(collection, (col) => {
  if (col) {
    markCollectionAsRead(col.slug, col.count)
  }
}, { immediate: true })
</script>

<template>
  <div class="max-w-5xl mx-auto">
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

    <div v-if="collection">
      <!-- Collection header -->
      <header class="mb-8">
        <div class="flex items-center gap-2 mb-3">
          <svg class="w-5 h-5 text-linear-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h1 class="text-2xl font-bold text-linear-text">{{ collection.name }}</h1>
        </div>
        <div class="flex items-center gap-3 flex-wrap">
          <router-link
            v-for="t in (collection.tags || [collection.tag])"
            :key="t"
            :to="`/tag/${encodeURIComponent(t)}`"
            class="text-xs px-2 py-0.5 rounded-full bg-linear-bg-tertiary text-linear-text-secondary border border-linear-border/30 hover:text-linear-accent transition-colors"
          >
            {{ t }}
          </router-link>
          <span class="text-sm text-linear-text-secondary">{{ collection.count }} 篇</span>
        </div>
      </header>

      <!-- Article grid with spread animation -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="(article, i) in collectionArticles"
          :key="article.slug"
          class="card-spread"
          :style="{ animationDelay: `${i * 80}ms` }"
        >
          <ArticleCard :article="article" />
        </div>
      </div>
    </div>

    <div v-else class="text-center py-20">
      <p class="text-linear-text-secondary">合集不存在</p>
      <router-link to="/" class="text-linear-accent text-sm mt-2 inline-block">返回首页</router-link>
    </div>
  </div>
</template>

<style scoped>
.card-spread {
  animation: spread 0.4s ease both;
}
@keyframes spread {
  from {
    opacity: 0;
    transform: translateY(-16px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
