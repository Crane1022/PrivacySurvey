<script setup>
import { ref } from 'vue'
import ResearchPanel from '../../components/research/ResearchPanel.vue'

const tabs = [['overview', 'Overview'], ['survey', 'Survey'], ['demographics', 'Demographics'], ['segmentation', 'Segmentation'], ['clusters', 'Clusters'], ['reports', 'Reports']]
const tab = ref('overview')
</script>

<template>
  <div>
    <div class="ad-toolbar" role="tablist">
      <button v-for="[k, l] in tabs" :key="k" role="tab" :aria-selected="tab === k" class="wp-btn ad-mini" :class="{ 'wp-btn-primary': tab === k }" @click="tab = k">{{ l }}</button>
    </div>
    <ResearchPanel :section="tab" />
  </div>
</template>
