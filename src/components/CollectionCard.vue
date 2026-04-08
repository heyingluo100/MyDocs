<script setup>
import { computed } from 'vue'
import { useReadStatus } from '../composables/useReadStatus.js'

const props = defineProps({
  collection: { type: Object, required: true },
  articles: { type: Array, required: true }
})

const { getCollectionDotType } = useReadStatus()

const latestTitle = props.articles.length ? props.articles[props.articles.length - 1].title : ''
const dotType = computed(() => getCollectionDotType(props.collection.slug, props.collection.count))
const allLocked = computed(() => props.articles.length > 0 && props.articles.every(a => a.locked))
</script>

<template>
  <router-link
    :to="`/collection/${encodeURIComponent(collection.slug)}`"
    class="block relative group"
  >
    <!-- Stacked layers behind -->
    <div class="absolute inset-0 bg-linear-bg-tertiary/60 rounded-2xl border border-linear-border/30 translate-x-1.5 translate-y-1.5"></div>
    <div class="absolute inset-0 bg-linear-bg-tertiary/40 rounded-2xl border border-linear-border/20 translate-x-3 translate-y-3"></div>

    <!-- Main card -->
    <div class="relative bg-linear-bg-secondary rounded-2xl border border-linear-border/50 p-5 hover:bg-linear-bg-tertiary hover:-translate-y-0.5 transition-[background-color,transform] duration-300">
      <!-- Status dot -->
      <span
        v-if="dotType"
        class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-linear-bg-secondary bg-amber-500"
      ></span>
      <div class="flex items-center gap-2 mb-2 flex-wrap">
        <span
          v-for="t in (collection.tags || [collection.tag])"
          :key="t"
          class="text-xs px-2 py-0.5 rounded-full bg-linear-bg-tertiary text-linear-text-secondary border border-linear-border/30"
        >
          {{ t }}
        </span>
        <span class="text-xs px-2 py-0.5 rounded-full bg-linear-accent/10 text-linear-accent border border-linear-accent/20">
          {{ collection.count }} 篇
        </span>
      </div>

      <div class="flex items-center gap-2 mb-2">
        <svg class="w-4 h-4 text-linear-accent shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <h3 class="text-base font-semibold text-linear-text group-hover:text-linear-accent transition-colors">
          {{ collection.name }}
        </h3>
        <svg v-if="allLocked" class="w-3.5 h-3.5 text-linear-text-secondary/50 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </div>

      <p v-if="latestTitle" class="text-sm text-linear-text-secondary line-clamp-1">
        最新：{{ latestTitle }}
      </p>
    </div>
  </router-link>
</template>
