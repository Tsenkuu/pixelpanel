<template>
  <div class="relative group spring-hover cursor-pointer h-full" @click="$emit('click')" @contextmenu.prevent="openContextMenu">
    <!-- Mesh Gradient Border Effect -->
    <div class="absolute -inset-[1px] bg-gradient-to-r from-[rgba(var(--mesh-1),0.5)] via-[rgba(var(--mesh-2),0.5)] to-[rgba(var(--mesh-3),0.5)] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
    
    <!-- Card Content -->
    <div class="relative h-full glass-panel p-6 flex flex-col justify-between rounded-xl bg-surface z-10">
    <div>
      <div class="flex justify-between items-start mb-4">
        <h3 class="text-lg font-bold text-primary">{{ app.name }}</h3>
        <span class="px-2.5 py-1 rounded-full text-xs font-semibold"
              :class="{
                'bg-success/20 text-success': app.pm2_status === 'online',
                'bg-error/20 text-error': app.pm2_status === 'errored',
                'bg-secondary/20 text-secondary': app.pm2_status !== 'online' && app.pm2_status !== 'errored'
              }">
          {{ app.pm2_status || 'offline' }}
        </span>
      </div>
      <div class="text-sm text-secondary mb-2 truncate" title="Git Repo">{{ app.git_repo || 'Local Directory' }}</div>
    </div>
    
      <div class="flex justify-between items-center mt-4 pt-4 border-t border-border/50">
        <span class="text-xs text-secondary">ID: {{ app.id }}</span>
        <!-- Context Menu Hint -->
        <span class="text-[10px] uppercase font-bold tracking-wider text-secondary/50 hidden group-hover:block transition-all">Right-click for options</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { contextMenuState } from '../store/contextMenu'

const props = defineProps({
  app: {
    type: Object,
    required: true
  }
})
const emit = defineEmits(['action', 'delete', 'click'])

const openContextMenu = (event) => {
  const isOnline = props.app.pm2_status === 'online'
  
  const menuItems = [
    {
      label: isOnline ? 'Restart Application' : 'Start Application',
      icon: '<svg class="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>',
      action: () => emit('action', isOnline ? 'restart' : 'start')
    },
    isOnline ? {
      label: 'Stop Application',
      icon: '<svg class="w-4 h-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"/></svg>',
      action: () => emit('action', 'stop')
    } : null,
    {
      label: 'View Logs',
      icon: '<svg class="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>',
      action: () => emit('click')
    },
    {
      label: 'Delete Application',
      icon: '<svg class="w-4 h-4 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>',
      action: () => emit('delete')
    }
  ].filter(Boolean)

  contextMenuState.open(event, menuItems)
}
</script>
