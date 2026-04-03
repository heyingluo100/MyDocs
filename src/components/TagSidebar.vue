<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useArticles } from '../composables/useArticles.js'

const props = defineProps({
  activeTag: { type: String, default: '' }
})

const route = useRoute()
const { allTags } = useArticles()

const currentTag = computed(() => props.activeTag || route.params.tag || '')
</script>

<template>
  <aside class="w-full">
    <h3 class="text-xs font-semibold text-linear-text-secondary uppercase tracking-wider mb-3">
      分类标签
    </h3>
    <nav class="space-y-1">
      <!-- All -->
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

      <!-- Tags -->
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
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
        <span class="flex-1">{{ tag.name }}</span>
        <span class="text-xs text-linear-text-secondary/60">{{ tag.count }}</span>
      </router-link>
    </nav>
  </aside>
</template>
