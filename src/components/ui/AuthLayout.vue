<script setup>
import Icon from './Icon.vue'
import CoastPanel from './CoastPanel.vue'

// Split auth layout. Respondent: coastal panel. Staff: dark forest "Research Workspace" panel.
defineProps({ staff: Boolean })
</script>

<template>
  <div class="auth" :class="{ staff }">
    <aside class="side" aria-hidden="false">
      <template v-if="!staff">
        <CoastPanel />
        <div class="shade"></div>
        <div class="over">
          <div class="glass"><span class="chip"><Icon name="lock" :size="13" /> Private by design</span>
            <p>Your answers belong to your own account and your own dashboard.</p></div>
          <h2>Your privacy.<br /><span class="serif-i">Your perspective.</span></h2>
        </div>
      </template>
      <template v-else>
        <svg class="lines" viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <g fill="none" stroke="#FA7F62" stroke-opacity="0.35"><circle cx="330" cy="120" r="90" /><circle cx="330" cy="120" r="140" /><circle cx="330" cy="120" r="190" /></g>
          <path d="M0 470c90-50 180-40 400 20" fill="none" stroke="#EFF2E9" stroke-opacity="0.18" /><path d="M0 510c110-50 200-30 400 30" fill="none" stroke="#EFF2E9" stroke-opacity="0.12" />
        </svg>
        <div class="over">
          <span class="chip"><Icon name="shield" :size="13" /> Staff only</span>
          <h2>Research Workspace<br /><span class="serif-i">Secure staff access.</span></h2>
        </div>
      </template>
    </aside>
    <main class="form"><div class="inner"><slot /></div></main>
  </div>
</template>

<style scoped>
.auth { display: grid; grid-template-columns: 46% 1fr; min-height: 100vh; padding: 8px; gap: 8px; background: var(--background); }
.side { position: relative; border-radius: 28px; overflow: hidden; min-height: 560px; background: var(--forest); }
.staff .side { background: var(--forest); }
.shade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(21, 22, 21, 0) 40%, rgba(21, 22, 21, 0.55)); }
.over { position: absolute; inset: auto 28px 28px 28px; color: white; display: flex; flex-direction: column; gap: 18px; }
.over h2 { font-size: clamp(30px, 3.6vw, 48px); line-height: 1.05; margin: 0; font-weight: 500; letter-spacing: -0.03em; }
.over h2 .serif-i { font-size: 1.08em; }
.glass { align-self: flex-start; max-width: 300px; background: rgba(255, 255, 255, 0.22); backdrop-filter: blur(14px); border: 1px solid rgba(255, 255, 255, 0.35); border-radius: 18px; padding: 14px 16px; }
.glass p { margin: 8px 0 0; font-size: 14px; line-height: 1.5; }
.lines { position: absolute; inset: 0; width: 100%; height: 100%; }
.form { background: var(--surface); border-radius: 28px; display: flex; align-items: center; justify-content: center; padding: 32px 20px; }
.inner { width: 100%; max-width: 420px; }
@media (max-width: 860px) {
  .auth { grid-template-columns: 1fr; padding: 0; gap: 0; }
  .form { order: -1; border-radius: 0 0 28px 28px; }
  .side { border-radius: 0; min-height: 260px; }
  .over { inset: auto 18px 18px 18px; }
  .glass { display: none; }
}
</style>
