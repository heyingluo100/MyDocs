import { onMounted, onUnmounted, ref } from 'vue'

export function useProtection() {
  const isDevToolsOpen = ref(false)
  let devtoolsCheckInterval = null
  let debuggerInterval = null
  let consoleInterval = null
  const isDev = import.meta.env.DEV
  // 在 setup 顶层捕获事件处理器引用，方便 onUnmounted 解绑
  const handlers = {
    contextmenu: null,
    keydown: null,
    dragstart: null,
    selectstart: null,
    visibilitychange: null
  }

  onMounted(() => {
    // Skip aggressive protection in dev mode
    if (isDev) return
    // === Layer 2: JS Behavior Interception ===

    handlers.contextmenu = (e) => {
      e.preventDefault()
      return false
    }

    handlers.keydown = (e) => {
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

    handlers.dragstart = (e) => {
      e.preventDefault()
      return false
    }

    handlers.selectstart = (e) => {
      e.preventDefault()
      return false
    }

    document.addEventListener('contextmenu', handlers.contextmenu)
    document.addEventListener('keydown', handlers.keydown)
    document.addEventListener('dragstart', handlers.dragstart)
    document.addEventListener('selectstart', handlers.selectstart)

    // === Layer 4: Anti-debugging ===

    // DevTools size detection
    devtoolsCheckInterval = setInterval(() => {
      const widthThreshold = window.outerWidth - window.innerWidth > 250
      const heightThreshold = window.outerHeight - window.innerHeight > 250
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
    consoleInterval = setInterval(() => {
      console.clear()
    }, 2000)

    // === Layer 6: Tab visibility detection ===
    handlers.visibilitychange = () => {
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
    document.addEventListener('visibilitychange', handlers.visibilitychange)
  })

  // Cleanup（提到 setup 顶层，符合 Vue 3 推荐写法）
  onUnmounted(() => {
    if (handlers.contextmenu) document.removeEventListener('contextmenu', handlers.contextmenu)
    if (handlers.keydown) document.removeEventListener('keydown', handlers.keydown)
    if (handlers.dragstart) document.removeEventListener('dragstart', handlers.dragstart)
    if (handlers.selectstart) document.removeEventListener('selectstart', handlers.selectstart)
    if (handlers.visibilitychange) document.removeEventListener('visibilitychange', handlers.visibilitychange)
    if (devtoolsCheckInterval) clearInterval(devtoolsCheckInterval)
    if (debuggerInterval) clearInterval(debuggerInterval)
    if (consoleInterval) clearInterval(consoleInterval)
  })

  return { isDevToolsOpen }
}
