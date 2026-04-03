<script setup>
defineProps({
  html: { type: String, required: true }
})
</script>

<template>
  <div class="protected-content" @copy.prevent @cut.prevent @paste.prevent @selectstart.prevent>
    <div class="article-body text-linear-text" v-html="html"></div>
  </div>
</template>
