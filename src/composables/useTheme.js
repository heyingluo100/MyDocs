import { ref, watch, effectScope } from 'vue'

function getInitialTheme() {
  const stored = localStorage.getItem('theme')
  if (stored) return stored
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  return 'light'
}

const theme = ref(getInitialTheme())

// 启动时立刻同步一次（避免 watch 还未触发时 DOM 没设置 data-theme）
document.documentElement.setAttribute('data-theme', theme.value)
localStorage.setItem('theme', theme.value)

// 模块级注册：仅监听一次系统主题变化，避免每次 useTheme() 重复 addEventListener 累积
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (!localStorage.getItem('theme')) {
    theme.value = e.matches ? 'dark' : 'light'
  }
})

// detached effectScope：watch 必须有 owner context，模块级用 effectScope 包裹
const scope = effectScope(true)
scope.run(() => {
  watch(theme, (val) => {
    document.documentElement.setAttribute('data-theme', val)
    localStorage.setItem('theme', val)
  })
})

export function useTheme() {
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
