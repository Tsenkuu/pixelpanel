<template>
  <div class="fixed inset-0 z-50 overflow-y-auto pt-[10vh] sm:pt-[20vh] px-4 pb-4 bg-black/60 backdrop-blur-sm" @click.self="$emit('close')">
    <div class="relative max-w-2xl mx-auto bg-surface border border-border shadow-2xl rounded-2xl overflow-hidden animate-scale-in flex flex-col">
      <!-- Search Input -->
      <div class="relative flex items-center p-4 border-b border-border">
        <svg class="w-6 h-6 text-secondary ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <input 
          ref="searchInput"
          v-model="query"
          type="text" 
          class="w-full bg-transparent border-none text-primary text-lg px-4 py-2 focus:outline-none focus:ring-0 placeholder:text-secondary"
          placeholder="What do you need?"
          @keydown.down.prevent="selectNext"
          @keydown.up.prevent="selectPrev"
          @keydown.enter.prevent="executeSelected"
          @keydown.esc.prevent="$emit('close')"
        >
        <kbd class="hidden sm:inline-block px-2 py-1 rounded bg-background border border-border text-xs text-secondary font-mono mr-2">ESC</kbd>
      </div>

      <!-- Results -->
      <div class="max-h-[60vh] overflow-y-auto p-2" v-if="filteredActions.length > 0">
        <div 
          v-for="(action, index) in filteredActions" 
          :key="action.id"
          class="group flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-colors"
          :class="{ 'bg-accent/10 text-accent': selectedIndex === index, 'text-primary hover:bg-surface-hover': selectedIndex !== index }"
          @mouseenter="selectedIndex = index"
          @click="executeSelected"
        >
          <div class="flex items-center">
            <span class="p-2 rounded-lg mr-4 bg-surface-hover" :class="{ 'bg-accent/20 text-accent': selectedIndex === index }">
              <!-- Render Icon based on action type -->
              <svg v-if="action.type === 'nav'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
              <svg v-if="action.type === 'action'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
            </span>
            <div>
              <div class="font-medium" :class="{ 'text-accent': selectedIndex === index }">{{ action.title }}</div>
              <div class="text-xs text-secondary mt-0.5">{{ action.subtitle }}</div>
            </div>
          </div>
          <kbd v-if="action.shortcut" class="hidden sm:inline-block px-2 py-1 rounded bg-background border border-border text-[10px] text-secondary font-mono uppercase">{{ action.shortcut }}</kbd>
        </div>
      </div>
      
      <!-- Empty State -->
      <div v-else class="p-8 text-center text-secondary">
        <p>No results found for "<span class="text-primary">{{ query }}</span>"</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'

const emit = defineEmits(['close'])
const router = useRouter()

const searchInput = ref(null)
const query = ref('')
const selectedIndex = ref(0)

const actions = [
  { id: 'nav-dash', type: 'nav', title: 'Go to Dashboard', subtitle: 'View system statistics', route: '/' },
  { id: 'nav-apps', type: 'nav', title: 'Go to Applications', subtitle: 'Manage deployed applications', route: '/apps' },
  { id: 'nav-settings', type: 'nav', title: 'Go to Settings', subtitle: 'Configure platform', route: '/settings' },
  { id: 'act-new-app', type: 'action', title: 'Deploy New Application', subtitle: 'Create from Git or Zip', action: () => { router.push('/apps'); emit('close') } },
  { id: 'act-logout', type: 'action', title: 'Logout', subtitle: 'Sign out of PixelPanel', action: () => { localStorage.removeItem('pixelpanel_token'); router.push('/login'); emit('close') } },
]

const filteredActions = computed(() => {
  if (!query.value) return actions
  const q = query.value.toLowerCase()
  return actions.filter(a => a.title.toLowerCase().includes(q) || a.subtitle.toLowerCase().includes(q))
})

const selectNext = () => {
  if (selectedIndex.value < filteredActions.value.length - 1) {
    selectedIndex.value++
  } else {
    selectedIndex.value = 0
  }
}

const selectPrev = () => {
  if (selectedIndex.value > 0) {
    selectedIndex.value--
  } else {
    selectedIndex.value = filteredActions.value.length - 1
  }
}

const executeSelected = () => {
  const action = filteredActions.value[selectedIndex.value]
  if (!action) return
  
  if (action.route) {
    router.push(action.route)
    emit('close')
  } else if (action.action) {
    action.action()
  }
}

onMounted(() => {
  nextTick(() => {
    searchInput.value?.focus()
  })
})
</script>
