<script setup>
// Page title, optional subtitle, breadcrumbs and an actions slot.
defineProps({ title: String, subtitle: String, crumbs: { type: Array, default: () => [] } })
</script>

<template>
  <header class="ph">
    <nav v-if="crumbs.length" class="crumbs" aria-label="Breadcrumb">
      <ol>
        <li v-for="(c, i) in crumbs" :key="c.label">
          <router-link v-if="c.to && i < crumbs.length - 1" :to="c.to">{{ c.label }}</router-link>
          <span v-else :aria-current="i === crumbs.length - 1 ? 'page' : undefined">{{ c.label }}</span>
        </li>
      </ol>
    </nav>
    <div class="row">
      <div>
        <h1>{{ title }}</h1>
        <p v-if="subtitle" class="sub">{{ subtitle }}</p>
      </div>
      <div class="actions"><slot name="actions" /></div>
    </div>
  </header>
</template>

<style scoped>
.ph { margin-bottom: 22px; }
.crumbs ol { list-style: none; display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 8px; padding: 0; font-size: 13px; color: var(--color-muted); }
.crumbs li + li::before { content: '/'; margin-right: 6px; }
.crumbs a { color: var(--color-text-secondary); text-decoration: none; }
.crumbs a:hover { color: var(--color-primary); }
.row { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
h1 { font-family: var(--font-display); font-size: 26px; font-weight: 700; letter-spacing: -0.5px; margin: 0; color: var(--color-text); }
.sub { margin: 6px 0 0; color: var(--color-text-secondary); font-size: 14px; max-width: 640px; line-height: 1.55; }
.actions { display: flex; gap: 10px; flex-wrap: wrap; }
</style>
