<script setup>
import { RouterView } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import WatermarkLayer from './components/WatermarkLayer.vue'
import { useTheme } from './composables/useTheme.js'
import { useProtection } from './composables/useProtection.js'

useTheme()
useProtection()
</script>

<template>
  <div class="min-h-screen bg-linear-bg text-linear-text font-sans overflow-x-hidden flex flex-col">
    <AppHeader />
    <main class="relative z-10 flex-1 max-w-7xl w-full mx-auto px-6 py-8">
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>
    <footer class="relative z-10 mt-auto">
      <div class="max-w-7xl mx-auto px-6 py-8 flex justify-center">
        <p class="text-xs text-linear-text-secondary/20 font-light tracking-widest">
          Personal Docs &copy; 2026
        </p>
      </div>
    </footer>
    <WatermarkLayer />
  </div>
</template>

<style scoped>
.page-enter-active,
.page-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.page-enter-active {
  pointer-events: none;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
