<script setup>
import { useTheme } from '../composables/useTheme.js'
import ThemeToggle from './ThemeToggle.vue'

const { theme } = useTheme()
</script>

<template>
  <header class="relative z-20 border-b border-linear-border/50">
    <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
      <router-link to="/" class="flex items-center gap-3 hover:opacity-80 transition-opacity">
        <div class="w-8 h-8 rounded-lg bg-linear-accent flex items-center justify-center">
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <span class="text-lg font-semibold text-linear-text">文档库</span>
      </router-link>
      <ThemeToggle />
    </div>
  </header>
</template>
