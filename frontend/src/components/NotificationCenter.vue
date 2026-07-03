<template>
  <div class="relative">
    <button @click="store.toggle" class="relative p-2 text-secondary hover:text-primary transition-colors focus:outline-none rounded-full hover:bg-surface">
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
      <span v-if="unreadCount > 0" class="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-accent rounded-full border-2 border-background"></span>
    </button>

    <transition name="slide-up">
      <div v-if="store.isOpen" class="absolute right-0 mt-2 w-80 sm:w-96 glass-panel overflow-hidden z-50">
        <div class="flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
          <h3 class="font-semibold text-primary text-sm">Notifications</h3>
          <button v-if="unreadCount > 0" @click="store.markAllRead" class="text-xs text-accent hover:text-accent-hover transition-colors">Mark all read</button>
        </div>
        
        <div class="max-h-96 overflow-y-auto">
          <div v-if="store.items.length === 0" class="p-6 text-center text-sm text-secondary">
            No notifications
          </div>
          <div v-else>
            <div v-for="item in store.items" :key="item.id" 
                 class="group relative px-4 py-3 border-b border-border last:border-b-0 hover:bg-surface-hover transition-colors"
                 :class="{ 'bg-accent/5': !item.read }">
              <div class="flex items-start">
                <div class="shrink-0 mt-0.5">
                  <svg v-if="item.type === 'success'" class="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  <svg v-else-if="item.type === 'error'" class="w-5 h-5 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  <svg v-else class="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <div class="ml-3 flex-1">
                  <p class="text-sm font-medium" :class="item.read ? 'text-primary' : 'text-primary'">{{ item.title }}</p>
                  <p class="text-xs text-secondary mt-1">{{ item.message }}</p>
                  <p class="text-[10px] text-secondary/60 mt-1">{{ new Date(item.time).toLocaleTimeString() }}</p>
                </div>
                <button @click="store.remove(item.id)" class="opacity-0 group-hover:opacity-100 p-1 text-secondary hover:text-error transition-all">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useNotificationStore } from '../stores/notifications'

const store = useNotificationStore()

const unreadCount = computed(() => {
  return store.items.filter(i => !i.read).length
})
</script>
