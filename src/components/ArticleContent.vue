<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  html: { type: String, required: true }
})

const hostRef = ref(null)
let shadow = null
let devtoolsTimer = null
let wasOpen = false

// Article-body styles injected into closed Shadow DOM (isolated from outer DOM)
// CSS custom properties (--color-linear-*, --article-font-scale) inherit through shadow boundary
const SHADOW_CSS = `
:host {
  display: block;
  user-select: none !important;
  -webkit-user-select: none !important;
  -webkit-touch-callout: none !important;
}
.article-body { font-size: calc(1rem * var(--article-font-scale, 1)); color: var(--color-linear-text); }
.article-body h1 { font-size: 1.75em; font-weight: 700; margin: 1.5rem 0 0.75rem; }
.article-body h2 { font-size: 1.375em; font-weight: 600; margin: 1.25rem 0 0.625rem; }
.article-body h3 { font-size: 1.125em; font-weight: 600; margin: 1rem 0 0.5rem; }
.article-body p { margin: 0.75rem 0; line-height: 1.8; white-space: pre-wrap; word-break: break-word; }
.article-body ul, .article-body ol { margin: 0.75rem 0; padding-left: 1.5rem; }
.article-body li { margin: 0.25rem 0; line-height: 1.7; }
.article-body blockquote {
  border-left: 3px solid var(--color-linear-accent);
  padding: 0.5rem 1rem;
  margin: 1rem 0;
  background: var(--color-linear-bg-secondary);
  border-radius: 0 0.5rem 0.5rem 0;
}
.article-body code {
  background: var(--color-linear-bg-tertiary);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.875em;
}
.article-body pre {
  background: var(--color-linear-bg-secondary);
  border: 1px solid var(--color-linear-border);
  border-radius: 0.5rem;
  padding: 1rem;
  overflow-x: auto;
  margin: 1rem 0;
}
.article-body pre code { background: none; padding: 0; }
.article-body a {
  color: var(--color-linear-accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.article-body img {
  max-width: 100%;
  border-radius: 0.5rem;
  margin: 1rem 0;
  pointer-events: none;
  -webkit-user-drag: none;
}
.article-body hr {
  border: none;
  border-top: 1px solid var(--color-linear-border);
  margin: 1.5rem 0;
}
.article-body table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
.article-body th, .article-body td {
  border: 1px solid var(--color-linear-border);
  padding: 0.5rem 0.75rem;
  text-align: left;
}
.article-body th { background: var(--color-linear-bg-secondary); font-weight: 600; }
`

function render() {
  if (!shadow || !props.html) return
  shadow.innerHTML = `<style>${SHADOW_CSS}</style><div class="article-body">${props.html}</div>`
}

function clearShadow() {
  if (!shadow) return
  shadow.innerHTML = ''
}

onMounted(() => {
  if (!hostRef.value) return
  shadow = hostRef.value.attachShadow({ mode: 'closed' })
  render()
  // Block copy/paste/select inside shadow DOM
  for (const evt of ['copy', 'cut', 'paste', 'selectstart']) {
    shadow.addEventListener(evt, e => e.preventDefault())
  }

  // DevTools detection: destroy shadow content when DevTools opens, restore when closed
  if (!import.meta.env.DEV) {
    devtoolsTimer = setInterval(() => {
      const open = window.outerWidth - window.innerWidth > 160 ||
                   window.outerHeight - window.innerHeight > 160
      if (open && !wasOpen) {
        clearShadow()
      } else if (!open && wasOpen) {
        render()
      }
      wasOpen = open
    }, 800)
  }
})

onBeforeUnmount(() => {
  clearInterval(devtoolsTimer)
})

watch(() => props.html, () => {
  if (!wasOpen) render()
})
</script>

<template>
  <div ref="hostRef" class="protected-content"></div>
</template>
