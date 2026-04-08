<script setup>
import { ref } from 'vue'
import { useInvitation } from '../composables/useInvitation.js'

const props = defineProps({
  title: { type: String, default: '' },
  lockHash: { type: String, default: '' },
  slug: { type: String, default: '' }
})

const emit = defineEmits(['unlocked'])

const { submitArticleCode } = useInvitation()

const code = ref('')
const error = ref(false)
const shaking = ref(false)
const loading = ref(false)

const handleSubmit = async () => {
  if (!code.value.trim() || loading.value) return
  loading.value = true
  error.value = false

  const ok = await submitArticleCode(props.slug, code.value.trim(), props.lockHash)
  loading.value = false

  if (ok) {
    emit('unlocked')
  } else {
    error.value = true
    shaking.value = true
    setTimeout(() => { shaking.value = false }, 500)
  }
}
</script>

<template>
  <div class="relative min-h-[60vh]">
    <!-- Blurred placeholder content -->
    <div class="select-none pointer-events-none" aria-hidden="true">
      <div class="space-y-4 filter blur-md opacity-40">
        <div v-for="i in 8" :key="i" class="h-4 bg-linear-text-secondary/10 rounded" :style="{ width: (60 + Math.random() * 40) + '%' }" />
        <div class="h-4 bg-linear-text-secondary/10 rounded w-3/4" />
        <div v-for="i in 6" :key="'b' + i" class="h-4 bg-linear-text-secondary/10 rounded" :style="{ width: (50 + Math.random() * 50) + '%' }" />
      </div>
    </div>

    <!-- Lock overlay -->
    <div class="absolute inset-0 flex items-start justify-center pt-16">
      <div
        class="w-full max-w-xs bg-linear-bg-secondary/80 backdrop-blur-xl rounded-2xl border border-linear-border/50 p-6 shadow-lg"
        :class="{ 'animate-shake': shaking }"
      >
        <!-- Lock icon -->
        <div class="flex justify-center mb-4">
          <div class="w-12 h-12 rounded-full bg-linear-accent/10 flex items-center justify-center">
            <svg class="w-6 h-6 text-linear-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
        </div>

        <p class="text-sm text-linear-text-secondary text-center mb-4">
          此文章需要邀请码
        </p>

        <form @submit.prevent="handleSubmit" class="space-y-3">
          <input
            v-model="code"
            type="text"
            placeholder="输入邀请码"
            autocomplete="off"
            autofocus
            class="w-full px-3 py-2.5 rounded-xl bg-linear-bg border text-linear-text placeholder-linear-text-secondary/50 text-center text-sm tracking-widest transition-colors duration-200 outline-none"
            :class="error
              ? 'border-red-400 focus:border-red-400'
              : 'border-linear-border/60 focus:border-linear-accent'"
            @input="error = false"
          />
          <p v-if="error" class="text-xs text-red-400 text-center">
            邀请码错误
          </p>
          <button
            type="submit"
            :disabled="!code.trim() || loading"
            class="w-full py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
            :class="code.trim() && !loading
              ? 'bg-linear-accent text-white hover:bg-linear-accent-hover active:scale-[0.98]'
              : 'bg-linear-bg-tertiary text-linear-text-secondary/50 cursor-not-allowed'"
          >
            {{ loading ? '验证中...' : '确认' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
  20%, 40%, 60%, 80% { transform: translateX(4px); }
}
.animate-shake {
  animation: shake 0.5s ease-in-out;
}
</style>
