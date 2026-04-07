<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useArticles } from '../composables/useArticles.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  activeTag: { type: String, default: '' }
})

const emit = defineEmits(['update:open'])

const route = useRoute()
const { allTags } = useArticles()

const currentTag = computed(() => props.activeTag || route.params.tag || '')
const totalCount = computed(() => allTags.value.reduce((s, t) => s + t.count, 0))

const close = () => {
  emit('update:open', false)
}

watch(() => route.fullPath, () => {
  close()
})
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        @click="close"
      ></div>
    </Transition>

    <!-- Bottom sheet panel -->
    <Transition name="slide-up">
      <div v-if="open" class="fixed inset-x-0 bottom-0 z-50">
        <div class="bg-linear-bg rounded-t-2xl border-t border-linear-border/50 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] max-h-[70vh] flex flex-col">
          <!-- Drag indicator -->
          <div class="flex justify-center pt-3 pb-2">
            <div class="w-10 h-1 rounded-full bg-linear-text-secondary/30"></div>
          </div>

          <!-- Header -->
          <div class="flex items-center justify-between px-6 mb-3">
            <h3 class="text-base font-semibold text-linear-text">分类</h3>
            <button
              @click="close"
              class="p-1.5 rounded-lg hover:bg-linear-bg-tertiary transition-colors"
            >
              <svg class="w-4 h-4 text-linear-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Tag list (scrollable) -->
          <nav class="flex-1 overflow-y-auto px-4 pb-6 space-y-1">
            <!-- "All" option -->
            <router-link
              to="/"
              @click="close"
              class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-300"
              :class="!currentTag
                ? 'bg-linear-accent/10 text-linear-accent font-medium'
                : 'text-linear-text-secondary hover:bg-linear-bg-tertiary hover:text-linear-text'"
            >
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span class="flex-1">全部</span>
              <span class="text-xs text-linear-text-secondary/60">{{ totalCount }}</span>
            </router-link>

            <!-- Tag list -->
            <router-link
              v-for="tag in allTags"
              :key="tag.name"
              :to="`/tag/${encodeURIComponent(tag.name)}`"
              @click="close"
              class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-300"
              :class="currentTag === tag.name
                ? 'bg-linear-accent/10 text-linear-accent font-medium'
                : 'text-linear-text-secondary hover:bg-linear-bg-tertiary hover:text-linear-text'"
            >
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span class="flex-1">{{ tag.name }}</span>
              <span class="text-xs text-linear-text-secondary/60">{{ tag.count }}</span>
            </router-link>
          </nav>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}
</style>
