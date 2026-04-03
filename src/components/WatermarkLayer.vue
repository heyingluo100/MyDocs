<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const canvasRef = ref(null)
let animationId = null
let refreshInterval = null

function generateWatermark(canvas) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const dpr = window.devicePixelRatio || 1

  canvas.width = window.innerWidth * dpr
  canvas.height = window.innerHeight * dpr
  canvas.style.width = window.innerWidth + 'px'
  canvas.style.height = window.innerHeight + 'px'
  ctx.scale(dpr, dpr)

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Generate watermark text
  const now = new Date()
  const timeStr = now.toLocaleString('zh-CN')
  const sessionId = Math.random().toString(36).substring(2, 8).toUpperCase()
  const text = `${timeStr} ${sessionId}`

  ctx.font = '14px sans-serif'
  ctx.fillStyle = 'rgba(128, 128, 128, 0.06)'
  ctx.textAlign = 'center'

  const gap = 220
  const angle = -25 * Math.PI / 180

  ctx.rotate(angle)

  // Fill the entire viewport with watermarks
  for (let y = -500; y < window.innerHeight + 500; y += gap) {
    for (let x = -500; x < window.innerWidth + 500; x += gap) {
      ctx.fillText(text, x, y)
    }
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0)
}

function handleResize() {
  generateWatermark(canvasRef.value)
}

onMounted(() => {
  generateWatermark(canvasRef.value)
  window.addEventListener('resize', handleResize)

  // Refresh watermark every 30 seconds (anti-DOM manipulation)
  refreshInterval = setInterval(() => {
    generateWatermark(canvasRef.value)
  }, 30000)

  // Monitor canvas removal (MutationObserver)
  const observer = new MutationObserver(() => {
    if (!document.querySelector('#watermark-canvas')) {
      // Canvas was removed, re-create it
      const newCanvas = document.createElement('canvas')
      newCanvas.id = 'watermark-canvas'
      newCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;pointer-events:none;'
      document.body.appendChild(newCanvas)
      canvasRef.value = newCanvas
      generateWatermark(newCanvas)
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    clearInterval(refreshInterval)
    observer.disconnect()
  })
})
</script>

<template>
  <canvas
    id="watermark-canvas"
    ref="canvasRef"
    class="fixed inset-0 w-full h-full pointer-events-none"
    style="z-index: 99999;"
  ></canvas>
</template>
