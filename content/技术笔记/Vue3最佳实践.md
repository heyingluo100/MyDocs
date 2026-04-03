---
title: Vue 3 最佳实践笔记
date: 2026-03-28
summary: 记录 Vue 3 Composition API 的一些使用心得和最佳实践。
---

# Vue 3 最佳实践笔记

## Composition API 要点

Vue 3 的 Composition API 让代码组织更加灵活。

### 使用 ref 而非 reactive

`ref` 更加直观，且在解构时不会丢失响应性：

```javascript
const count = ref(0)
const name = ref('hello')
```

### Composable 模式

将可复用逻辑抽取为 composable 函数：

```javascript
export function useCounter(initial = 0) {
  const count = ref(initial)
  const increment = () => count.value++
  return { count, increment }
}
```

## 总结

Composition API 的核心优势在于逻辑复用和代码组织。
