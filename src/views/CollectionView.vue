<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useArticles } from '../composables/useArticles.js'
import ArticleCard from '../components/ArticleCard.vue'

const route = useRoute()
const { getArticlesByCollection, getCollectionBySlug } = useArticles()

const collectionSlug = computed(() => decodeURIComponent(route.params.slug || ''))
const collection = computed(() => getCollectionBySlug(collectionSlug.value))
const collectionArticles = computed(() => getArticlesByCollection(collectionSlug.value))
</script>

<template>
  <div class="max-w-5xl mx-auto">
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

    <div v-if="collection">
      <!-- Collection header -->
      <header class="mb-8">
        <div class="flex items-center gap-2 mb-3">
          <svg class="w-5 h-5 text-linear-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h1 class="text-2xl font-bold text-linear-text">{{ collection.name }}</h1>
        </div>
        <div class="flex items-center gap-3">
          <router-link
            :to="`/tag/${encodeURIComponent(collection.tag)}`"
            class="text-xs px-2 py-0.5 rounded-full bg-linear-bg-tertiary text-linear-text-secondary border border-linear-border/30 hover:text-linear-accent transition-colors"
          >
            {{ collection.tag }}
          </router-link>
          <span class="text-sm text-linear-text-secondary">{{ collection.count }} 篇</span>
        </div>
      </header>

      <!-- Article grid (same as homepage) -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ArticleCard
          v-for="article in collectionArticles"
          :key="article.slug"
          :article="article"
        />
      </div>
    </div>

    <div v-else class="text-center py-20">
      <p class="text-linear-text-secondary">合集不存在</p>
      <router-link to="/" class="text-linear-accent text-sm mt-2 inline-block">返回首页</router-link>
    </div>
  </div>
</template>
