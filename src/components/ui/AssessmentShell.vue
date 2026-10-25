<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import CoastPanel from './CoastPanel.vue'
import Icon from './Icon.vue'

const route = useRoute()
const steps = [['consent', 'Consent'], ['demographics', 'About you'], ['assessment', 'Questions'], ['review', 'Review']]
const idx = computed(() => Math.max(0, steps.findIndex(s => s[0] === route.name)))
</script>

<template>
  <div class="shell">
    <aside class="panel" aria-label="Assessment information">
      <CoastPanel />
      <div class="tint"></div>
      <div class="inner">
        <ol class="steps" aria-label="Assessment steps">
          <li v-for="([k, label], i) in steps" :key="k" :class="{ done: i < idx, now: i === idx }">
            <span class="dot"><Icon v-if="i < idx" name="check" :size="12" /><template v-else>{{ i + 1 }}</template></span>{{ label }}
          </li>
        </ol>
        <div class="glass"><Icon name="lock" :size="15" /> Your answers are saved to your own account and are not shown to other respondents.</div>
      </div>
    </aside>
    <section class="content"><slot /></section>
  </div>
</template>

<style scoped>
.shell { display: grid; grid-template-columns: 340px 1fr; gap: 8px; padding: 8px; min-height: calc(100vh - 72px); }
.panel { position: sticky; top: 80px; align-self: start; height: calc(100vh - 96px); min-height: 480px; border-radius: 28px; overflow: hidden; background: var(--forest); }
.tint { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(21, 22, 21, .35), rgba(21, 22, 21, .05) 40%, rgba(21, 22, 21, .5)); }
.inner { position: absolute; inset: 22px; display: flex; flex-direction: column; justify-content: space-between; color: white; }
.steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; font-size: 14px; font-weight: 500; }
.steps li { display: flex; align-items: center; gap: 10px; opacity: .75; }
.steps li.now { opacity: 1; }
.dot { width: 24px; height: 24px; border-radius: 50%; border: 1.5px solid rgba(255, 255, 255, .8); display: inline-flex; align-items: center; justify-content: center; font-size: 12px; }
.now .dot { background: var(--accent); border-color: var(--accent); color: var(--ink); }
.done .dot { background: white; color: var(--forest); border-color: white; }
.glass { display: flex; gap: 10px; background: rgba(255, 255, 255, .22); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, .35); border-radius: 16px; padding: 12px 14px; font-size: 13px; line-height: 1.5; }
.content { background: var(--surface); border-radius: 28px; padding: clamp(18px, 4vw, 44px); min-width: 0; }
.content :deep(.wp-page) { max-width: 720px; padding: 0; margin: 0 auto; }
@media (max-width: 900px) {
  .shell { grid-template-columns: 1fr; padding: 0; }
  .panel { position: relative; top: 0; height: 120px; min-height: 0; border-radius: 0 0 24px 24px; }
  .glass { display: none; }
  .inner { inset: 14px 18px; }
  .steps { flex-direction: row; flex-wrap: wrap; gap: 6px 14px; font-size: 12px; }
  .content { border-radius: 24px 24px 0 0; margin-top: -16px; position: relative; }
}
</style>
