<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()
const to = hash => router.push({ name: 'landing', hash })
</script>

<template>
  <footer class="foot">
    <div class="in">
      <div>
        <strong>Privacy Profiling System</strong>
        <p>An academic research prototype (Taylor's University Capstone Project, Group 19) based on the Westin Privacy Segmentation framework. Not a commercial service.</p>
      </div>
      <nav aria-label="Footer">
        <button @click="to('#about')">About</button>
        <button @click="to('#privacy')">Privacy Information</button>
        <button @click="to('#research')">Research Purpose</button>
        <button @click="router.push({ name: 'staff-login' })">Staff Login</button>
      </nav>
    </div>
  </footer>
</template>

<style scoped>
.foot { border-top: 1px solid rgba(21,22,21,.08); background: var(--surface); margin-top: 40px; }
.in { max-width: 1100px; margin: 0 auto; padding: 28px 24px; display: flex; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
p { margin: 6px 0 0; font-size: 13px; color: var(--color-text-secondary); max-width: 420px; line-height: 1.6; }
nav { display: flex; gap: 6px; flex-wrap: wrap; align-items: flex-start; }
button { background: none; border: none; font: 500 14px var(--font-sans); color: var(--color-text-secondary); cursor: pointer; padding: 6px 10px; border-radius: 8px; }
button:hover { color: var(--color-primary); background: var(--color-primary-light); }
</style>
