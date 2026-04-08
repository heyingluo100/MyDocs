<script setup>
import { useTheme } from '../composables/useTheme.js'

const { theme, toggleTheme } = useTheme()
</script>

<template>
  <button
    @click="toggleTheme"
    class="theme-toggle"
    :class="{ 'is-dark': theme === 'dark' }"
    :title="theme === 'dark' ? '切换亮色' : '切换暗色'"
  >
    <div class="icon-wrapper">
      <!-- Sun icon -->
      <svg class="icon icon-sun" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
      <!-- Moon icon -->
      <svg class="icon icon-moon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    </div>
  </button>
</template>

<style scoped>
.theme-toggle {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--color-linear-bg-secondary);
  border: 1px solid var(--color-linear-border);
  cursor: pointer;
  transition: background 0.3s, border-color 0.3s, box-shadow 0.3s, transform 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.theme-toggle:hover {
  background: var(--color-linear-bg-tertiary);
  transform: scale(1.08);
  box-shadow: 0 0 12px color-mix(in srgb, var(--color-linear-accent) 25%, transparent);
}

.theme-toggle:active {
  transform: scale(0.95);
}

.icon-wrapper {
  position: relative;
  width: 20px;
  height: 20px;
}

.icon {
  position: absolute;
  inset: 0;
  width: 20px;
  height: 20px;
  color: var(--color-linear-text-secondary);
  transition: opacity 0.4s ease, transform 0.4s ease;
}

/* 亮色模式：显示月亮，隐藏太阳 */
.icon-sun {
  opacity: 0;
  transform: rotate(-90deg) scale(0.5);
}
.icon-moon {
  opacity: 1;
  transform: rotate(0deg) scale(1);
}

/* 暗色模式：显示太阳，隐藏月亮 */
.is-dark .icon-sun {
  opacity: 1;
  transform: rotate(0deg) scale(1);
}
.is-dark .icon-moon {
  opacity: 0;
  transform: rotate(90deg) scale(0.5);
}
</style>
