<script setup>
import { ref } from 'vue'
import { useInvitation } from '../composables/useInvitation.js'
import { useTheme } from '../composables/useTheme.js'

const { submitGlobalCode } = useInvitation()
const { theme } = useTheme()

const code = ref('')
const error = ref(false)
const shaking = ref(false)
const loading = ref(false)

const handleSubmit = async () => {
  if (!code.value.trim() || loading.value) return
  loading.value = true
  error.value = false

  const ok = await submitGlobalCode(code.value.trim())
  loading.value = false

  if (!ok) {
    error.value = true
    shaking.value = true
    setTimeout(() => { shaking.value = false }, 500)
  }
}
</script>

<template>
  <div class="fixed inset-0 z-[9999] bg-linear-bg flex items-center justify-center px-4">
    <!-- Decorative gradient orbs -->
    <div class="absolute top-1/4 left-1/4 w-64 h-64 bg-linear-accent/5 rounded-full blur-3xl pointer-events-none" />
    <div class="absolute bottom-1/3 right-1/4 w-48 h-48 bg-linear-ai-primary/5 rounded-full blur-3xl pointer-events-none" />

    <div class="relative w-full max-w-sm">
      <!-- Card -->
      <div
        class="bg-linear-bg-secondary/60 backdrop-blur-xl rounded-2xl border border-linear-border/50 p-8 shadow-lg"
        :class="{ 'animate-shake': shaking }"
      >
        <!-- Lock icon -->
        <div class="flex justify-center mb-6">
          <div class="w-14 h-14 rounded-full bg-linear-accent/10 flex items-center justify-center">
            <svg class="w-7 h-7 text-linear-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
        </div>

        <!-- Title -->
        <h1 class="text-xl font-semibold text-linear-text text-center mb-1">
          Personal Docs
        </h1>
        <p class="text-sm text-linear-text-secondary text-center mb-6">
          请输入邀请码访问
        </p>

        <!-- Input -->
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <input
              v-model="code"
              type="text"
              placeholder="输入邀请码"
              autocomplete="off"
              autofocus
              class="w-full px-4 py-3 rounded-xl bg-linear-bg border text-linear-text placeholder-linear-text-secondary/50 text-center text-base tracking-widest transition-colors duration-200 outline-none"
              :class="error
                ? 'border-red-400 focus:border-red-400'
                : 'border-linear-border/60 focus:border-linear-accent'"
              @input="error = false"
            />
            <p v-if="error" class="mt-2 text-xs text-red-400 text-center">
              邀请码错误，请重新输入
            </p>
          </div>

          <button
            type="submit"
            :disabled="!code.trim() || loading"
            class="w-full py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
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
