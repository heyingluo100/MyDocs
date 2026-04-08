<script setup>
import { RouterView } from 'vue-router'
import { useRouter } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import CategorySidebar from './components/CategorySidebar.vue'
import WatermarkLayer from './components/WatermarkLayer.vue'
import { useTheme } from './composables/useTheme.js'
import { useProtection } from './composables/useProtection.js'

useTheme()
useProtection()

const router = useRouter()

// 保存滚动位置：离开页面前记录
const scrollPositions = new Map()

router.beforeEach((to, from) => {
  scrollPositions.set(from.fullPath, window.scrollY)
})

// popstate（浏览器后退/前进）标记
let isPop = false
window.addEventListener('popstate', () => {
  isPop = true
})

// Transition @enter：新 DOM 已挂载但还在 opacity:0，此时滚动无感知
const handleEnter = () => {
  if (isPop) {
    const saved = scrollPositions.get(router.currentRoute.value.fullPath)
    window.scrollTo(0, saved ?? 0)
  } else {
    window.scrollTo(0, 0)
  }
  isPop = false
}
</script>

<template>
  <div class="min-h-screen bg-linear-bg text-linear-text font-sans overflow-x-hidden flex flex-col">
    <AppHeader />
    <div class="relative z-10 flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex gap-8">
      <CategorySidebar />
      <main class="flex-1 min-w-0">
        <RouterView v-slot="{ Component }">
          <Transition name="page" mode="out-in" @enter="handleEnter">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </main>
    </div>
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
