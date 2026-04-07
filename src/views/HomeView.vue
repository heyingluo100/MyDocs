<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useArticles } from '../composables/useArticles.js'
import TagPopover from '../components/TagPopover.vue'
import TagBottomSheet from '../components/TagBottomSheet.vue'
import ArticleCard from '../components/ArticleCard.vue'

const route = useRoute()
const { getArticlesByTag } = useArticles()
const showMobileSheet = ref(false)

const currentTag = computed(() => {
  return route.params.tag ? decodeURIComponent(route.params.tag) : ''
})

const filteredArticles = computed(() => {
  return getArticlesByTag(currentTag.value)
})
</script>

<template>
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
          {{ filteredArticles.length }} 篇
        </span>

        <!-- Mobile filter button -->
        <button
          class="lg:hidden ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all duration-300 bg-linear-bg-secondary text-linear-text-secondary border-linear-border hover:bg-linear-bg-tertiary"
          @click="showMobileSheet = true"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          分类
        </button>
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

  <!-- Mobile bottom sheet -->
  <TagBottomSheet v-model:open="showMobileSheet" :active-tag="currentTag" />
</template>
