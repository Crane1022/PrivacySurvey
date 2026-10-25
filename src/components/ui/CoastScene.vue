<script setup>
// Original SVG illustration (golden-hour clifftop meadow with a lighthouse). Default media for hero and auth panels;
// replaced by a photo/video when VITE_HERO_IMAGE_URL / VITE_HERO_VIDEO_URL are set.
let seed = 7
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
const flowers = Array.from({ length: 70 }, () => {
  const x = rnd() * 420
  const y = 640 + rnd() * 240 + x * 0.12
  return { x, y, r: 1.6 + rnd() * 2.6, c: rnd() > 0.45 ? '#FFFFFF' : '#F6D86B' }
})
</script>

<template>
  <svg viewBox="0 0 600 900" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Golden-hour clifftop meadow with a lighthouse above the sea" class="scene">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F7C9B6" /><stop offset="0.5" stop-color="#FA9C7E" /><stop offset="1" stop-color="#FBD3A4" /></linearGradient>
      <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F1B08F" /><stop offset="0.4" stop-color="#C98876" /><stop offset="1" stop-color="#4E6D74" /></linearGradient>
      <radialGradient id="glow"><stop offset="0" stop-color="#FFF1CF" stop-opacity="0.95" /><stop offset="1" stop-color="#FFF1CF" stop-opacity="0" /></radialGradient>
    </defs>
    <rect width="600" height="900" fill="url(#sky)" />
    <circle cx="330" cy="470" r="190" fill="url(#glow)" />
    <circle cx="330" cy="470" r="52" fill="#FFF3D6" />
    <g fill="#FFFFFF" opacity="0.4"><ellipse cx="130" cy="190" rx="110" ry="14" /><ellipse cx="420" cy="140" rx="90" ry="11" /><ellipse cx="250" cy="300" rx="130" ry="12" /></g>
    <rect y="520" width="600" height="380" fill="url(#sea)" />
    <g stroke="#FFE6C2" stroke-width="2" opacity="0.7" stroke-linecap="round"><path d="M270 540h120M290 556h80M300 574h60" /></g>
    <path d="M330 640c40-6 70-60 120-150l60-100c30-20 60-20 90 0V900H300z" fill="#4C5A38" />
    <path d="M410 600c40-30 60-90 100-160 20-40 50-60 90-50v200H400z" fill="#6A7843" />
    <g transform="translate(520 330)">
      <path d="M-14 62l5-62h18l5 62z" fill="#FAF9F5" />
      <rect x="-12" y="18" width="24" height="9" fill="#FA7F62" /><rect x="-9" y="38" width="18" height="8" fill="#FA7F62" />
      <rect x="-11" y="-12" width="22" height="12" fill="#2C3426" /><path d="M-14 -12L0 -26l14 14z" fill="#FAF9F5" />
      <circle cx="0" cy="-6" r="4" fill="#FFE9A8" />
    </g>
    <path d="M0 640C120 620 260 700 420 790L600 900H0z" fill="#7C8A45" />
    <path d="M0 720C140 700 280 780 420 880L430 900H0z" fill="#5E6E34" />
    <g><circle v-for="(f, i) in flowers" :key="i" :cx="f.x" :cy="f.y" :r="f.r" :fill="f.c" /></g>
  </svg>
</template>

<style scoped>
.scene { width: 100%; height: 100%; display: block; }
</style>
