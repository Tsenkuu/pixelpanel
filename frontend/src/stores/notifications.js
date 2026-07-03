import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useNotificationStore = defineStore('notifications', () => {
  const items = ref([
    // Dummy initial notification
    { id: 1, type: 'info', title: 'Welcome to PixelPanel V2', message: 'The platform has been successfully updated.', time: new Date(), read: false }
  ])
  const isOpen = ref(false)

  const add = (notification) => {
    items.value.unshift({
      id: Date.now(),
      time: new Date(),
      read: false,
      ...notification
    })
  }

  const markAllRead = () => {
    items.value.forEach(item => item.read = true)
  }

  const remove = (id) => {
    items.value = items.value.filter(item => item.id !== id)
  }

  const toggle = () => {
    isOpen.value = !isOpen.value
  }

  return { items, isOpen, add, markAllRead, remove, toggle }
})
