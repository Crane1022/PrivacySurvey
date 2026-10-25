<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: { type: Array, required: true }, // [{ name, value, color }]
  size: { type: Number, default: 260 },
  innerRadiusRatio: { type: Number, default: 0.62 },
})

const cx = computed(() => props.size / 2)
const cy = computed(() => props.size / 2)
const outerR = computed(() => props.size / 2 - 10)
const innerR = computed(() => outerR.value * props.innerRadiusRatio)

const total = computed(() => props.data.reduce((s, d) => s + d.value, 0))

const slices = computed(() => {
  let angle = -Math.PI / 2
  return props.data.map(d => {
    const fraction = d.value / total.value
    const startAngle = angle
    const endAngle = angle + fraction * Math.PI * 2
    angle = endAngle
    return { ...d, startAngle, endAngle }
  })
})

function arcPath(startAngle, endAngle) {
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0
  const x1o = cx.value + outerR.value * Math.cos(startAngle)
  const y1o = cy.value + outerR.value * Math.sin(startAngle)
  const x2o = cx.value + outerR.value * Math.cos(endAngle)
  const y2o = cy.value + outerR.value * Math.sin(endAngle)
  const x1i = cx.value + innerR.value * Math.cos(endAngle)
  const y1i = cy.value + innerR.value * Math.sin(endAngle)
  const x2i = cx.value + innerR.value * Math.cos(startAngle)
  const y2i = cy.value + innerR.value * Math.sin(startAngle)
  return [
    `M ${x1o} ${y1o}`,
    `A ${outerR.value} ${outerR.value} 0 ${largeArc} 1 ${x2o} ${y2o}`,
    `L ${x1i} ${y1i}`,
    `A ${innerR.value} ${innerR.value} 0 ${largeArc} 0 ${x2i} ${y2i}`,
    'Z',
  ].join(' ')
}
</script>

<template>
  <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`">
    <path v-for="slice in slices" :key="slice.name" :d="arcPath(slice.startAngle, slice.endAngle)" :fill="slice.color" stroke="white" stroke-width="2" />
  </svg>
</template>
