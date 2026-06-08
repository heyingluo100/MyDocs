<script setup>
import { ref, watch } from 'vue'

defineProps({
  html: { type: String, default: '' }
})

const showDialog = ref(false)

// Lock body scroll while dialog is open
watch(showDialog, (val) => {
  document.body.style.overflow = val ? 'hidden' : ''
})
</script>

<template>
  <div v-if="html">
    <!-- Trigger button (homepage banner) -->
    <button
      @click="showDialog = true"
      class="w-full mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-linear-bg-secondary border border-linear-border/50 hover:bg-linear-bg-tertiary transition-colors text-left"
    >
      <svg class="w-4 h-4 text-linear-accent shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
      <span class="flex-1 text-sm font-medium text-linear-text">网站使用说明</span>
      <span class="text-xs text-linear-text-secondary shrink-0">点击查看</span>
      <svg class="w-4 h-4 text-linear-text-secondary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5l7 7-7 7" />
      </svg>
    </button>

    <!-- Dialog -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showDialog" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <!-- Backdrop -->
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showDialog = false"></div>
          <!-- Dialog panel -->
          <div class="relative w-full max-w-2xl max-h-[85vh] bg-linear-bg rounded-2xl border border-linear-border/50 shadow-xl flex flex-col overflow-hidden">
            <!-- Header -->
            <div class="flex items-center gap-3 px-6 py-4 border-b border-linear-border/50 shrink-0">
              <svg class="w-5 h-5 text-linear-accent shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h3 class="flex-1 text-base font-semibold text-linear-text">网站使用说明</h3>
              <button @click="showDialog = false" class="p-1.5 rounded-lg hover:bg-linear-bg-tertiary transition-colors shrink-0">
                <svg class="w-4 h-4 text-linear-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <!-- Scrollable body -->
            <div class="flex-1 overflow-y-auto px-6 py-5">
              <div class="reader-guide-body text-sm text-linear-text-secondary leading-relaxed" v-html="html"></div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Markdown body styles */
.reader-guide-body :deep(h1) {
  display: none; /* Hide top-level title (already in dialog header) */
}
.reader-guide-body :deep(h2) {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-linear-text);
  margin-top: 1.5rem;
  margin-bottom: 0.625rem;
}
.reader-guide-body :deep(h2:first-child) {
  margin-top: 0;
}
.reader-guide-body :deep(h3) {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-linear-text);
  margin-top: 1.125rem;
  margin-bottom: 0.5rem;
}
.reader-guide-body :deep(p) {
  margin: 0.5rem 0;
}
.reader-guide-body :deep(ul),
.reader-guide-body :deep(ol) {
  padding-left: 1.25rem;
  margin: 0.5rem 0;
}
.reader-guide-body :deep(li) {
  margin: 0.25rem 0;
}
.reader-guide-body :deep(strong) {
  color: var(--color-linear-text);
  font-weight: 600;
}
.reader-guide-body :deep(code) {
  background: var(--color-linear-bg-tertiary);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.8125rem;
}
.reader-guide-body :deep(blockquote) {
  border-left: 3px solid var(--color-linear-accent);
  padding-left: 0.875rem;
  margin: 0.75rem 0;
  color: var(--color-linear-text-secondary);
}
.reader-guide-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0.75rem 0;
  font-size: 0.8125rem;
}
.reader-guide-body :deep(th),
.reader-guide-body :deep(td) {
  border: 1px solid var(--color-linear-border);
  padding: 0.5rem 0.75rem;
  text-align: left;
}
.reader-guide-body :deep(th) {
  background: var(--color-linear-bg-tertiary);
  font-weight: 600;
  color: var(--color-linear-text);
}
.reader-guide-body :deep(hr) {
  border: 0;
  border-top: 1px solid var(--color-linear-border);
  margin: 1rem 0;
}
</style>
