<script setup>
import { useAuthStore } from '../../stores/auth'
import AdminOverview from '../admin/AdminOverview.vue'
import ResearchPanel from '../../components/research/ResearchPanel.vue'

const auth = useAuthStore()
</script>

<template>
  <AdminOverview v-if="auth.isAdmin" />
  <ResearchPanel v-else section="overview" />
</template>
