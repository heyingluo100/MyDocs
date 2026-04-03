<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useArticles } from '../composables/useArticles.js'
import TagSidebar from '../components/TagSidebar.vue'
import ArticleCard from '../components/ArticleCard.vue'

const route = useRoute()
const { getArticlesByTag, allTags } = useArticles()
const showMobileTags = ref(false)

const currentTag = computed(() => {
  return route.params.tag ? decodeURIComponent(route.params.tag) : ''
})

const filteredArticles = computed(() => {
  return getArticlesByTag(currentTag.value)
})

// Auto-close mobile tag panel on route change
watch(() => route.params.tag, () => {
  showMobileTags.value = false
})
</script>

<template>
  <div class="flex flex-col lg:flex-row gap-8">
    <!-- Desktop sidebar (collapsible) -->
    <div class="hidden lg:block lg:w-56 shrink-0">
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

        <!-- Mobile filter button -->
        <button
          class="lg:hidden ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all duration-300"
          :class="showMobileTags
            ? 'bg-linear-accent text-white border-linear-accent'
            : 'bg-linear-bg-secondary text-linear-text-secondary border-linear-border hover:bg-linear-bg-tertiary'"
          @click="showMobileTags = !showMobileTags"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          分类
        </button>
      </div>

      <!-- Mobile tag panel (inline expand) -->
      <Transition name="slide-down">
        <div
          v-if="showMobileTags"
          class="lg:hidden mb-6 p-4 rounded-2xl bg-linear-bg-secondary border border-linear-border/50"
        >
          <nav class="space-y-1">
            <router-link
              to="/"
              :class="[
                'flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-300',
                !currentTag
                  ? 'bg-linear-accent/10 text-linear-accent font-medium'
                  : 'text-linear-text-secondary hover:bg-linear-bg-tertiary hover:text-linear-text'
              ]"
            >
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span class="flex-1">全部</span>
              <span class="text-xs text-linear-text-secondary/60">{{ allTags.reduce((s, t) => s + t.count, 0) }}</span>
            </router-link>

            <router-link
              v-for="tag in allTags"
              :key="tag.name"
              :to="`/tag/${encodeURIComponent(tag.name)}`"
              :class="[
                'flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-300',
                currentTag === tag.name
                  ? 'bg-linear-accent/10 text-linear-accent font-medium'
                  : 'text-linear-text-secondary hover:bg-linear-bg-tertiary hover:text-linear-text'
              ]"
            >
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span class="flex-1">{{ tag.name }}</span>
              <span class="text-xs text-linear-text-secondary/60">{{ tag.count }}</span>
            </router-link>
          </nav>
        </div>
      </Transition>

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
  margin-bottom: 0;
  padding-top: 0;
  padding-bottom: 0;
}
.slide-down-enter-to,
.slide-down-leave-from {
  opacity: 1;
  max-height: 500px;
}
</style>
