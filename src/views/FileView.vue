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

// 白名单：只允许字母数字、中文、点、连字符、下划线、空格，并禁止 .. 路径片段
const VALID_FILENAME = /^[\w一-鿿. \-]+$/
function sanitize(name) {
  if (!name) return ''
  if (name.includes('..') || name.includes('/') || name.includes('\\')) return ''
  return VALID_FILENAME.test(name) ? name : ''
}

const safeFilename = computed(() => sanitize(decodeURIComponent(route.params.filename || '')))
const fileUrl = computed(() => safeFilename.value ? `/files/${encodeURIComponent(safeFilename.value)}` : '')
const isPdf = computed(() => safeFilename.value.toLowerCase().endsWith('.pdf'))
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

    <h1 class="text-xl font-bold text-linear-text mb-6">{{ safeFilename || '无效的文件名' }}</h1>

    <!-- 非法文件名 -->
    <div v-if="!safeFilename" class="text-center py-20 bg-linear-bg-secondary rounded-2xl border border-linear-border/50">
      <svg class="w-12 h-12 text-red-400/60 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <p class="text-sm text-linear-text-secondary/80">文件名不合法，已拒绝访问</p>
    </div>

    <!-- PDF Preview -->
    <div v-else-if="isPdf" class="protected-content">
      <div v-if="isLoading" class="flex items-center justify-center py-20">
        <div class="animate-spin w-8 h-8 border-2 border-linear-border border-t-linear-accent rounded-full"></div>
      </div>
      <iframe
        :src="fileUrl"
        sandbox="allow-scripts allow-same-origin"
        referrerpolicy="no-referrer"
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
      <p class="text-linear-text-secondary mb-2">{{ safeFilename }}</p>
      <p class="text-sm text-linear-text-secondary/60">该文件类型暂不支持在线预览</p>
    </div>
  </div>
</template>
