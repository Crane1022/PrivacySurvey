<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Nav from './components/Nav.vue'
import SiteFooter from './components/SiteFooter.vue'
import ToastHost from './components/common/ToastHost.vue'

const route = useRoute()
const staff = computed(() => route.meta.area === 'staff')
const bare = computed(() => route.meta.bare) // landing and auth pages bring their own header/layout
</script>

<template>
  <div :style="{ minHeight: '100vh', background: staff ? 'var(--surface)' : 'var(--background)', fontFamily: 'var(--font-sans)' }">
    <router-view v-if="staff" />
    <template v-else>
      <Nav v-if="!bare" />
      <main>
        <router-view v-slot="{ Component }">
          <transition mode="out-in" enter-active-class="page-enter" leave-active-class="page-exit">
            <component :is="Component" :key="route.path" />
          </transition>
        </router-view>
      </main>
      <SiteFooter v-if="!bare || route.name === 'landing'" />
    </template>
    <ToastHost />
  </div>
</template>
