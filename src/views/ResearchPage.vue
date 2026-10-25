<script setup>
import { useRoute } from 'vue-router'
import ResearchPanel from '../components/research/ResearchPanel.vue'

const route = useRoute()
</script>

<template>
  <ResearchPanel :section="route.meta.section" />
</template>
