<script setup>
// Draws ANY explanation in the shape documented in src/ml/explain.js
// (works for the test classifier today and for a backend model with SHAP values later).
import { computed } from 'vue'
import { WPSI_CATEGORIES } from '../../utils/wpsi'

const props = defineProps({
  explanation: { type: Object, required: true },
  showSections: { type: Boolean, default: true },
})
const F = WPSI_CATEGORIES['Privacy Fundamentalist'].color
const P = WPSI_CATEGORIES['Privacy Pragmatist'].color
const U = WPSI_CATEGORIES['Privacy Unconcerned'].color

const ex = computed(() => props.explanation)
const pct = v => Math.round(Math.max(0, Math.min(1, v)) * 100)
const maxAbs = computed(() => Math.max(0.0001, ...(ex.value.factors ?? []).map(f => Math.abs(f.contribution))))
const width = f => (Math.abs(f.contribution) / maxAbs.value) * 50 // half the track per side
const stanceText = { protective: 'Privacy-protective', unprotective: 'Not protective', neutral: 'Neutral' }
</script>

<template>
  <div class="xai">
    <p class="wp-text summary">{{ ex.summary }}</p>

    <!-- Score meter with the three category bands -->
    <div v-if="ex.score != null && ex.thresholds" class="meter" role="img" :aria-label="`Privacy concern score ${pct(ex.score)} out of 100`">
      <div class="track">
        <span class="band" :style="{ left: 0, width: pct(ex.thresholds.unconcerned) + '%', background: U }"></span>
        <span class="band" :style="{ left: pct(ex.thresholds.unconcerned) + '%', width: pct(ex.thresholds.fundamentalist) - pct(ex.thresholds.unconcerned) + '%', background: P }"></span>
        <span class="band" :style="{ left: pct(ex.thresholds.fundamentalist) + '%', right: 0, background: F }"></span>
        <span class="marker" :style="{ left: pct(ex.score) + '%' }"><b>{{ pct(ex.score) }}</b></span>
      </div>
      <div class="ends"><span>Less concerned</span><span>More concerned</span></div>
    </div>

    <!-- Rule-based models: show each core statement and the stance it counted as -->
    <template v-if="ex.method === 'rule'">
      <div v-for="f in ex.factors" :key="f.questionId" class="rule">
        <span class="chip" :class="f.stance">{{ stanceText[f.stance] ?? f.stance }}</span>
        <div><div class="q">{{ f.label }}</div><div class="a">Your answer: {{ f.answer }}</div></div>
      </div>
    </template>

    <!-- Contribution models: diverging bars (left = towards Unconcerned, right = towards Fundamentalist) -->
    <template v-else-if="ex.factors?.length">
      <h3>Answers that shaped your result most</h3>
      <div class="legend"><span :style="{ color: U }">◀ towards Unconcerned</span><span :style="{ color: F }">towards Fundamentalist ▶</span></div>
      <div v-for="f in ex.factors" :key="f.questionId" class="row">
        <div class="lbl" :title="f.label">{{ f.label }}<span class="a"> · {{ f.answer }}</span></div>
        <div class="div-track">
          <span class="axis"></span>
          <span v-if="f.contribution < 0" class="bar" :style="{ right: '50%', width: width(f) + '%', background: U }"></span>
          <span v-else class="bar" :style="{ left: '50%', width: width(f) + '%', background: F }"></span>
        </div>
      </div>
    </template>

    <template v-if="showSections && ex.sections?.length">
      <h3>Concern score by section</h3>
      <div v-for="s in ex.sections" :key="s.section" class="sec">
        <span class="sl">{{ s.section }}</span>
        <div class="st"><span :style="{ width: pct(s.score) + '%' }"></span></div>
        <span class="sv">{{ pct(s.score) }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.summary { margin-top: 0; }
h3 { font-size: 14px; font-weight: 600; margin: 18px 0 8px; }
.meter { margin: 6px 0 4px; }
.track { position: relative; height: 12px; border-radius: 99px; overflow: visible; background: #eee; margin-top: 26px; }
.band { position: absolute; top: 0; bottom: 0; opacity: .28; }
.band:first-child { border-radius: 99px 0 0 99px; } .band:nth-child(3) { border-radius: 0 99px 99px 0; }
.marker { position: absolute; top: -6px; width: 4px; height: 24px; margin-left: -2px; border-radius: 2px; background: var(--ink, #1d1d1b); }
.marker b { position: absolute; bottom: 26px; left: 50%; transform: translateX(-50%); font-size: 13px; }
.ends { display: flex; justify-content: space-between; font-size: 12px; color: var(--ink-soft, #666); margin-top: 6px; }
.legend { display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; margin-bottom: 6px; }
.row { margin-bottom: 10px; }
.lbl { font-size: 13px; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.lbl .a, .a { color: var(--ink-soft, #666); }
.div-track { position: relative; height: 10px; margin-top: 4px; }
.axis { position: absolute; left: 50%; top: -3px; bottom: -3px; width: 1px; background: #bbb; }
.bar { position: absolute; top: 0; bottom: 0; border-radius: 3px; }
.sec { display: grid; grid-template-columns: minmax(0, 1fr) 40% 28px; gap: 8px; align-items: center; font-size: 13px; margin-bottom: 6px; }
.sl { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.st { height: 8px; background: #eee; border-radius: 99px; overflow: hidden; } .st span { display: block; height: 100%; background: var(--ink, #2C3426); opacity: .7; }
.sv { text-align: right; font-variant-numeric: tabular-nums; }
.rule { display: flex; gap: 10px; align-items: flex-start; margin: 10px 0; }
.rule .q { font-size: 13px; } .rule .a { font-size: 12px; }
.chip { flex: none; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 99px; background: #eee; }
.chip.protective { background: #F1EEFA; color: #6B5BB5; } .chip.unprotective { background: #EAF1FA; color: #3B6FB6; }
</style>
