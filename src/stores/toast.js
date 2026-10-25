import { defineStore } from 'pinia'

let n = 0
export const useToastStore = defineStore('toast', {
  state: () => ({ items: [] }),
  actions: {
    push(message, type = 'success') {
      const id = ++n
      this.items.push({ id, message, type })
      setTimeout(() => this.dismiss(id), type === 'error' ? 7000 : 3500)
    },
    success(m) { this.push(m, 'success') },
    error(m) { this.push(m, 'error') },
    dismiss(id) { this.items = this.items.filter(t => t.id !== id) },
  },
})
