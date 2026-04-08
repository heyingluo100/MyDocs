import { ref, watchEffect } from 'vue'

function getInitialTheme() {
  const stored = localStorage.getItem('theme')
  if (stored) return stored
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  return 'light'
}

const theme = ref(getInitialTheme())

export function useTheme() {
  watchEffect(() => {
    document.documentElement.setAttribute('data-theme', theme.value)
    localStorage.setItem('theme', theme.value)
  })

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      theme.value = e.matches ? 'dark' : 'light'
    }
  })

  const toggleTheme = () => {
    // 添加过渡 class，让全局颜色平滑切换
    document.documentElement.classList.add('theme-transition')
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    // 过渡结束后移除，避免影响其他交互性能
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transition')
    }, 450)
  }

  return { theme, toggleTheme }
}
