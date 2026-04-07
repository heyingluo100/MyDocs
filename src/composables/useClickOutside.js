import { onMounted, onBeforeUnmount } from 'vue'

export function useClickOutside(elementRef, callback) {
  const handler = (event) => {
    if (elementRef.value && !elementRef.value.contains(event.target)) {
      callback(event)
    }
  }

  onMounted(() => {
    document.addEventListener('pointerdown', handler)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('pointerdown', handler)
  })
}
