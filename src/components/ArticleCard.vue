<script setup>
import { useRouter } from 'vue-router'

defineProps({
  article: { type: Object, required: true }
})

const router = useRouter()

const handleCollectionClick = (e, collectionSlug) => {
  e.preventDefault()
  e.stopPropagation()
  router.push(`/collection/${encodeURIComponent(collectionSlug)}`)
}
</script>

<template>
  <router-link
    :to="`/article/${article.slug}`"
    class="block bg-linear-bg-secondary rounded-2xl border border-linear-border/50 p-5 hover:bg-linear-bg-tertiary hover:-translate-y-0.5 transition-[background-color,transform] duration-300 group"
  >
    <div class="flex items-center gap-2 mb-2 flex-wrap">
      <span
        v-for="tag in article.tags"
        :key="tag"
        class="text-xs px-2 py-0.5 rounded-full bg-linear-bg-tertiary text-linear-text-secondary border border-linear-border/30"
      >
        {{ tag }}
      </span>
      <a
        v-if="article.collection"
        href="#"
        @click="handleCollectionClick($event, article.collectionSlug)"
        class="text-xs px-2 py-0.5 rounded-full bg-linear-accent/10 text-linear-accent border border-linear-accent/20 hover:bg-linear-accent/20 transition-colors"
      >
        {{ article.collection }}
      </a>
    </div>
    <h3 class="text-base font-semibold text-linear-text group-hover:text-linear-accent transition-colors mb-2">
      {{ article.title }}
    </h3>
    <p v-if="article.summary" class="text-sm text-linear-text-secondary line-clamp-2 mb-3">
      {{ article.summary }}
    </p>
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span v-if="article.createdAt" class="text-xs text-linear-text-secondary/60">
          {{ article.createdAt }}
        </span>
        <span v-if="article.updatedAt && article.updatedAt !== article.createdAt" class="text-xs text-linear-text-secondary/40">
          · 更新于 {{ article.updatedAt }}
        </span>
      </div>
      <div v-if="article.files && article.files.length" class="flex items-center gap-1 text-xs text-linear-text-secondary/60">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
        {{ article.files.length }} 附件
      </div>
    </div>
  </router-link>
</template>
