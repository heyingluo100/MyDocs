<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useArticles } from '../composables/useArticles.js'

const route = useRoute()
const { allTags } = useArticles()

const currentTag = computed(() => {
  return route.params.tag ? decodeURIComponent(route.params.tag) : ''
})

const totalCount = computed(() => allTags.value.reduce((s, t) => s + t.count, 0))
</script>

<template>
  <aside class="w-56 shrink-0 hidden lg:block">
    <nav class="sticky top-8">
      <p class="text-xs font-medium tracking-wider text-linear-text-secondary/50 uppercase mb-3 px-3">
        分类
      </p>
      <ul class="space-y-0.5">
        <!-- "全部" option -->
        <li>
          <router-link
            to="/"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200"
            :class="!currentTag
              ? 'bg-linear-accent/10 text-linear-accent font-medium'
              : 'text-linear-text-secondary hover:bg-linear-bg-tertiary hover:text-linear-text'"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span class="flex-1 truncate">全部</span>
            <span class="text-xs text-linear-text-secondary/50">{{ totalCount }}</span>
          </router-link>
        </li>

        <!-- Tag list -->
        <li v-for="tag in allTags" :key="tag.name">
          <router-link
            :to="`/tag/${encodeURIComponent(tag.name)}`"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200"
            :class="currentTag === tag.name
              ? 'bg-linear-accent/10 text-linear-accent font-medium'
              : 'text-linear-text-secondary hover:bg-linear-bg-tertiary hover:text-linear-text'"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span class="flex-1 truncate">{{ tag.name }}</span>
            <span class="text-xs text-linear-text-secondary/50">{{ tag.count }}</span>
          </router-link>
        </li>
      </ul>
    </nav>
  </aside>
</template>
