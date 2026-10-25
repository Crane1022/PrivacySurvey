<script setup>
import { ref, onMounted } from 'vue'
import CoastScene from './CoastScene.vue'

// Media for rounded hero/auth panels. Priority: video (if configured, motion allowed) > photo > built-in illustration.
const imageUrl = import.meta.env.VITE_HERO_IMAGE_URL || ''
const videoUrl = import.meta.env.VITE_HERO_VIDEO_URL || ''
const playVideo = ref(false)
const ready = ref(false)
onMounted(() => { playVideo.value = !!videoUrl && !matchMedia('(prefers-reduced-motion: reduce)').matches })
</script>

<template>
  <div class="media">
    <img v-if="imageUrl" :src="imageUrl" alt="" class="fill" />
    <CoastScene v-else />
    <video v-if="playVideo" class="fill vid" :class="{ on: ready }" :src="videoUrl" autoplay muted loop playsinline aria-hidden="true" @canplay="ready = true"></video>
  </div>
</template>

<style scoped>
.media { position: absolute; inset: 0; overflow: hidden; }
.fill { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.vid { opacity: 0; transition: opacity 0.8s ease; }
.vid.on { opacity: 1; }
</style>
