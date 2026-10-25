<script setup>
import { ref } from 'vue'
import Icon from './Icon.vue'

defineProps({ modelValue: String, id: String, label: String, autocomplete: String, error: String })
defineEmits(['update:modelValue'])
const show = ref(false) // hidden by default
</script>

<template>
  <div class="wp-field">
    <label class="wp-label" :for="id">{{ label }}</label>
    <div class="wp-pwwrap">
      <input
        :id="id" class="wp-input" :type="show ? 'text' : 'password'" :value="modelValue" :autocomplete="autocomplete"
        :aria-invalid="!!error" :aria-describedby="error ? id + '-err' : undefined"
        @input="$emit('update:modelValue', $event.target.value)"
      />
      <button type="button" class="wp-pwbtn" :aria-label="show ? 'Hide password' : 'Show password'" :aria-pressed="show" @click="show = !show">
        <Icon :name="show ? 'eye-off' : 'eye'" :size="18" />
      </button>
    </div>
    <p v-if="error" :id="id + '-err'" class="wp-fielderr" role="alert">{{ error }}</p>
  </div>
</template>
