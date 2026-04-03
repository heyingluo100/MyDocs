<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useArticles } from '../composables/useArticles.js'
import ArticleContent from '../components/ArticleContent.vue'

const route = useRoute()
const { getArticleBySlug, decodeContent } = useArticles()

const article = computed(() => getArticleBySlug(route.params.slug))

const htmlContent = computed(() => {
  if (!article.value) return ''
  return decodeContent(article.value.content)
})
</script>

<template>
  <div v-if="article" class="max-w-3xl mx-auto">
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
    <header class="mb-8">
      <h1 class="text-2xl font-bold text-linear-text mb-3">{{ article.title }}</h1>
      <div class="flex items-center gap-3 flex-wrap">
        <span v-if="article.date" class="text-sm text-linear-text-secondary">
          {{ article.date }}
        </span>
        <span
          v-for="tag in article.tags"
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
    <div v-if="article.files && article.files.length" class="mt-10 pt-6 border-t border-linear-border/50">
      <h3 class="text-sm font-semibold text-linear-text-secondary uppercase tracking-wider mb-3">
        附件文件
      </h3>
      <div class="space-y-2">
        <router-link
          v-for="file in article.files"
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

  <div v-else class="text-center py-20">
    <p class="text-linear-text-secondary">文章不存在</p>
    <router-link to="/" class="text-linear-accent text-sm mt-2 inline-block">返回首页</router-link>
  </div>
</template>
