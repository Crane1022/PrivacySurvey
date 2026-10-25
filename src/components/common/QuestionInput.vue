<script setup>
import { computed } from 'vue'

const props = defineProps({
  question: { type: Object, required: true },
  modelValue: { default: undefined },
})
const emit = defineEmits(['update:modelValue'])
const name = computed(() => props.question.questionId)
const selected = computed(() => (props.question.type === 'multiple' ? props.modelValue ?? [] : props.modelValue))

function toggle(value, checked) {
  const cur = new Set(selected.value)
  checked ? cur.add(value) : cur.delete(value)
  emit('update:modelValue', [...cur])
}
</script>

<template>
  <fieldset class="wp-card" style="min-width: 0; margin-bottom: 0;">
    <legend style="padding: 0;">
      <span v-if="question.scenario" class="wp-text" style="display: block; margin-bottom: 10px;">{{ question.scenario }}</span>
      <span class="wp-title" style="font-size: 21px; display: block; margin-bottom: 6px;">{{ question.questionText }}</span>
      <span class="wp-text" style="display: block; font-size: 13px; margin-bottom: 14px;">
        {{ question.type === 'multiple' ? 'Select all that apply.' : 'Select one.' }}{{ question.isRequired ? '' : ' (Optional)' }}
      </span>
    </legend>

    <select v-if="question.type === 'dropdown'" class="wp-select" :aria-label="question.questionText" :value="modelValue ?? ''" @change="emit('update:modelValue', $event.target.value)">
      <option value="" disabled>Select…</option>
      <option v-for="o in question.options" :key="o.value" :value="o.value">{{ o.label }}</option>
    </select>

    <template v-else-if="question.type === 'multiple'">
      <label v-for="o in question.options" :key="o.value" class="wp-option">
        <input type="checkbox" :value="o.value" :checked="selected.includes(o.value)" @change="toggle(o.value, $event.target.checked)" />
        <span>{{ o.label }}</span>
      </label>
    </template>

    <template v-else>
      <label v-for="o in question.options" :key="o.value" class="wp-option">
        <input type="radio" :name="name" :value="o.value" :checked="modelValue === o.value" @change="emit('update:modelValue', o.value)" />
        <span>{{ o.label }}</span>
      </label>
    </template>
  </fieldset>
</template>
