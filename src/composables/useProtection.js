import { onMounted, onUnmounted, ref } from 'vue'

export function useProtection() {
  const isDevToolsOpen = ref(false)
  let devtoolsCheckInterval = null
  let debuggerInterval = null
  const isDev = import.meta.env.DEV

  onMounted(() => {
    // Skip aggressive protection in dev mode
    if (isDev) return
    // === Layer 2: JS Behavior Interception ===

    // Disable right-click context menu
    const handleContextMenu = (e) => {
      e.preventDefault()
      return false
    }

    // Block keyboard shortcuts
    const handleKeyDown = (e) => {
      // Ctrl+C, Ctrl+U, Ctrl+S, Ctrl+P, Ctrl+A
      if (e.ctrlKey && ['c', 'u', 's', 'p', 'a'].includes(e.key.toLowerCase())) {
        e.preventDefault()
        return false
      }
      // F12
      if (e.key === 'F12') {
        e.preventDefault()
        return false
      }
      // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
      if (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase())) {
        e.preventDefault()
        return false
      }
      // Ctrl+G (go to line in devtools)
      if (e.ctrlKey && e.key.toLowerCase() === 'g') {
        e.preventDefault()
        return false
      }
    }

    // Disable text dragging
    const handleDragStart = (e) => {
      e.preventDefault()
      return false
    }

    // Disable text selection on mobile
    const handleSelectStart = (e) => {
      e.preventDefault()
      return false
    }

    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('dragstart', handleDragStart)
    document.addEventListener('selectstart', handleSelectStart)

    // === Layer 4: Anti-debugging ===

    // DevTools size detection
    devtoolsCheckInterval = setInterval(() => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160
      const heightThreshold = window.outerHeight - window.innerHeight > 160
      const wasOpen = isDevToolsOpen.value
      isDevToolsOpen.value = widthThreshold || heightThreshold

      if (isDevToolsOpen.value && !wasOpen) {
        // Blur content when DevTools detected
        const content = document.querySelector('.protected-content')
        if (content) {
          content.style.filter = 'blur(10px)'
          content.style.transition = 'filter 0.3s'
        }
      } else if (!isDevToolsOpen.value && wasOpen) {
        const content = document.querySelector('.protected-content')
        if (content) {
          content.style.filter = ''
        }
      }
    }, 1000)

    // Debugger trap (timing-based detection)
    debuggerInterval = setInterval(() => {
      const start = performance.now()
      // eslint-disable-next-line no-debugger
      debugger
      const end = performance.now()
      if (end - start > 100) {
        isDevToolsOpen.value = true
        const content = document.querySelector('.protected-content')
        if (content) {
          content.style.filter = 'blur(10px)'
          content.style.transition = 'filter 0.3s'
        }
      }
    }, 3000)

    // Clear console
    const clearConsole = () => {
      console.clear()
    }
    const consoleInterval = setInterval(clearConsole, 2000)

    // === Layer 6: Tab visibility detection ===
    const handleVisibilityChange = () => {
      const content = document.querySelector('.protected-content')
      if (!content) return
      if (document.hidden) {
        content.style.filter = 'blur(20px)'
        content.style.transition = 'filter 0.1s'
      } else {
        // Small delay before unblur to prevent screenshot timing
        setTimeout(() => {
          if (!document.hidden && !isDevToolsOpen.value) {
            content.style.filter = ''
          }
        }, 300)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup
    onUnmounted(() => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('dragstart', handleDragStart)
      document.removeEventListener('selectstart', handleSelectStart)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(devtoolsCheckInterval)
      clearInterval(debuggerInterval)
      clearInterval(consoleInterval)
    })
  })

  return { isDevToolsOpen }
}
