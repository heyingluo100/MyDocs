<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useArticles } from '../composables/useArticles.js'
import { useClickOutside } from '../composables/useClickOutside.js'

const props = defineProps({
  activeTag: { type: String, default: '' }
})

const route = useRoute()
const { allTags, allCollections } = useArticles()

const open = ref(false)
const wrapperRef = ref(null)

const currentTag = computed(() => props.activeTag || route.params.tag || '')
const totalCount = computed(() => allTags.value.reduce((s, t) => s + t.count, 0))

const toggle = () => {
  open.value = !open.value
}

const close = () => {
  open.value = false
}

useClickOutside(wrapperRef, close)

watch(() => route.fullPath, () => {
  close()
})

const handleKeydown = (e) => {
  if (e.key === 'Escape') close()
}
</script>

<template>
  <div ref="wrapperRef" class="relative">
    <!-- Trigger area -->
    <div class="flex items-center gap-2">
      <button
        @click="toggle"
        class="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-300"
        :class="open
          ? 'bg-linear-bg-tertiary text-linear-text'
          : 'text-linear-text-secondary hover:bg-linear-bg-tertiary'"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        分类
        <svg
          class="w-3 h-3 transition-transform duration-300"
          :class="{ 'rotate-180': open }"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <!-- Active tag chip -->
      <router-link
        v-if="!open && currentTag"
        to="/"
        class="text-xs px-2 py-1 rounded-full bg-linear-accent/10 text-linear-accent flex items-center gap-1 transition-all duration-300 hover:bg-linear-accent/20"
      >
        {{ currentTag }}
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </router-link>
    </div>

    <!-- Popover panel -->
    <Transition name="popover">
      <div
        v-if="open"
        class="absolute top-full left-0 mt-2 w-56 z-30 bg-linear-bg rounded-2xl border border-linear-border/50 shadow-lg overflow-hidden"
        @keydown="handleKeydown"
      >
        <nav class="p-2 max-h-80 overflow-y-auto space-y-1">
          <!-- "All" option -->
          <router-link
            to="/"
            @click="close"
            class="flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-300"
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
            class="flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-300"
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

          <!-- Collections section -->
          <template v-if="allCollections.length">
            <div class="border-t border-linear-border/30 my-2"></div>
            <div class="px-3 py-1 text-xs text-linear-text-secondary/50">合集</div>
            <router-link
              v-for="col in allCollections"
              :key="col.slug"
              :to="`/collection/${encodeURIComponent(col.slug)}`"
              @click="close"
              class="flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-300 text-linear-text-secondary hover:bg-linear-bg-tertiary hover:text-linear-text"
            >
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span class="flex-1">{{ col.tag }} / {{ col.name }}</span>
              <span class="text-xs text-linear-text-secondary/60">{{ col.count }}</span>
            </router-link>
          </template>
        </nav>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.popover-enter-active {
  transition: all 0.2s ease;
}
.popover-leave-active {
  transition: all 0.15s ease;
}
.popover-enter-from,
.popover-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}
</style>
