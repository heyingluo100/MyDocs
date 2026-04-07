<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}

const filename = computed(() => decodeURIComponent(route.params.filename || ''))
const fileUrl = computed(() => `/files/${filename.value}`)
const isPdf = computed(() => filename.value.toLowerCase().endsWith('.pdf'))
const isLoading = ref(true)

const handleLoad = () => {
  isLoading.value = false
}
</script>

<template>
  <div class="max-w-4xl mx-auto">
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

    <h1 class="text-xl font-bold text-linear-text mb-6">{{ filename }}</h1>

    <!-- PDF Preview -->
    <div v-if="isPdf" class="protected-content">
      <div v-if="isLoading" class="flex items-center justify-center py-20">
        <div class="animate-spin w-8 h-8 border-2 border-linear-border border-t-linear-accent rounded-full"></div>
      </div>
      <iframe
        :src="fileUrl"
        class="w-full rounded-xl border border-linear-border/50"
        style="height: 80vh;"
        @load="handleLoad"
      ></iframe>
    </div>

    <!-- Other files -->
    <div v-else class="text-center py-20 bg-linear-bg-secondary rounded-2xl border border-linear-border/50">
      <svg class="w-12 h-12 text-linear-text-secondary/40 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p class="text-linear-text-secondary mb-2">{{ filename }}</p>
      <p class="text-sm text-linear-text-secondary/60">该文件类型暂不支持在线预览</p>
    </div>
  </div>
</template>
