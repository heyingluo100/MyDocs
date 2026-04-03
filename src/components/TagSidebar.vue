<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useArticles } from '../composables/useArticles.js'

const props = defineProps({
  activeTag: { type: String, default: '' }
})

const route = useRoute()
const { allTags } = useArticles()

const currentTag = computed(() => props.activeTag || route.params.tag || '')
const collapsed = ref(true)
</script>

<template>
  <aside class="w-full">
    <div class="flex items-center gap-2">
      <button
        @click="collapsed = !collapsed"
        class="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-300"
        :class="collapsed
          ? 'text-linear-text-secondary hover:bg-linear-bg-tertiary'
          : 'bg-linear-bg-tertiary text-linear-text'"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        分类
        <svg
          class="w-3 h-3 transition-transform duration-300"
          :class="{ 'rotate-180': !collapsed }"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <!-- Show active tag when collapsed -->
      <router-link
        v-if="collapsed && currentTag"
        to="/"
        class="text-xs px-2 py-1 rounded-full bg-linear-accent/10 text-linear-accent flex items-center gap-1"
      >
        {{ currentTag }}
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </router-link>
    </div>

    <Transition name="expand">
      <nav v-if="!collapsed" class="space-y-1 mt-2">
        <router-link
          to="/"
          @click="collapsed = true"
          :class="[
            'flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-300',
            !currentTag
              ? 'bg-linear-accent/10 text-linear-accent font-medium'
              : 'text-linear-text-secondary hover:bg-linear-bg-tertiary hover:text-linear-text'
          ]"
        >
          <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span class="flex-1">全部</span>
          <span class="text-xs text-linear-text-secondary/60">{{ allTags.reduce((s, t) => s + t.count, 0) }}</span>
        </router-link>

        <router-link
          v-for="tag in allTags"
          :key="tag.name"
          :to="`/tag/${encodeURIComponent(tag.name)}`"
          @click="collapsed = true"
          :class="[
            'flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-300',
            currentTag === tag.name
              ? 'bg-linear-accent/10 text-linear-accent font-medium'
              : 'text-linear-text-secondary hover:bg-linear-bg-tertiary hover:text-linear-text'
          ]"
        >
          <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span class="flex-1">{{ tag.name }}</span>
          <span class="text-xs text-linear-text-secondary/60">{{ tag.count }}</span>
        </router-link>
      </nav>
    </Transition>
  </aside>
</template>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
}
.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 500px;
}
</style>
