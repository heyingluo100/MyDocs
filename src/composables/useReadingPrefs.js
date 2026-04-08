import { ref, watchEffect } from 'vue'

const STORAGE_KEY = 'article-font-size'

const FONT_SIZES = [
  { key: 'small', label: 'A-', scale: 0.875 },
  { key: 'default', label: 'A', scale: 1 },
  { key: 'large', label: 'A+', scale: 1.125 },
  { key: 'xlarge', label: 'A++', scale: 1.25 }
]

const currentSize = ref(localStorage.getItem(STORAGE_KEY) || 'default')

watchEffect(() => {
  localStorage.setItem(STORAGE_KEY, currentSize.value)
  const entry = FONT_SIZES.find(s => s.key === currentSize.value)
  document.documentElement.style.setProperty('--article-font-scale', entry ? entry.scale : 1)
})

export function useReadingPrefs() {
  return { FONT_SIZES, currentSize }
}
