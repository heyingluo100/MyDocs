<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useArticles } from '../composables/useArticles.js'
import TagSidebar from '../components/TagSidebar.vue'
import ArticleCard from '../components/ArticleCard.vue'

const route = useRoute()
const { getArticlesByTag } = useArticles()

const currentTag = computed(() => {
  return route.params.tag ? decodeURIComponent(route.params.tag) : ''
})

const filteredArticles = computed(() => {
  return getArticlesByTag(currentTag.value)
})
</script>

<template>
  <div class="flex flex-col lg:flex-row gap-8">
    <!-- Sidebar -->
    <div class="lg:w-56 shrink-0">
      <TagSidebar :active-tag="currentTag" />
    </div>

    <!-- Article list -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-3 mb-6">
        <h1 class="text-xl font-bold text-linear-text">
          {{ currentTag || '全部文档' }}
        </h1>
        <span class="text-sm text-linear-text-secondary">
          {{ filteredArticles.length }} 篇
        </span>
      </div>

      <div v-if="filteredArticles.length" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ArticleCard
          v-for="article in filteredArticles"
          :key="article.slug"
          :article="article"
        />
      </div>

      <div v-else class="text-center py-20">
        <p class="text-linear-text-secondary">暂无文档</p>
      </div>
    </div>
  </div>
</template>
