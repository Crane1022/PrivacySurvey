<script setup>
import { computed } from 'vue'
const props = defineProps({ labels: Array, matrix: Array })
const max = computed(() => Math.max(1, ...props.matrix.flat()))
const shade = v => `rgba(79, 70, 229, ${0.08 + (v / max.value) * 0.8})`
</script>

<template>
  <div class="ad-tablewrap">
    <table class="ad-table" aria-label="Confusion matrix (rows actual, columns predicted)">
      <thead><tr><th>Actual ↓ / Predicted →</th><th v-for="l in labels" :key="l">{{ l }}</th></tr></thead>
      <tbody>
        <tr v-for="(row, i) in matrix" :key="i">
          <td><strong>{{ labels[i] }}</strong></td>
          <td v-for="(v, j) in row" :key="j" :style="{ background: shade(v), color: v / max > 0.5 ? 'white' : 'inherit', textAlign: 'center' }">{{ v }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
