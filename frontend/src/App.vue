<template>
  <div class="min-h-screen bg-background flex text-primary font-sans overflow-hidden" ref="appContainer">
    <!-- Mobile overlay (No longer needed since sidebar is hidden on mobile, but keep for future use) -->
    <div v-if="isMobileMenuOpen" class="fixed inset-0 bg-black/60 z-20 md:hidden animate-fade-in" @click="isMobileMenuOpen = false"></div>

    <!-- Desktop Sidebar (Hidden on mobile) -->
    <aside v-if="isAuthenticated" 
           :class="[
             'hidden md:flex flex-col fixed md:static inset-y-0 left-0 z-30 bg-surface border-r border-border transition-all duration-300 ease-in-out',
             isSidebarCollapsed ? 'w-20' : 'w-64'
           ]">
      
      <div class="h-16 flex items-center justify-between px-4 border-b border-border">
        <div class="flex items-center overflow-hidden">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-accent to-purple-500 flex items-center justify-center shrink-0">
            <span class="text-white font-bold text-lg">P</span>
          </div>
          <transition name="fade">
            <h1 v-if="!isSidebarCollapsed" class="ml-3 text-lg font-semibold tracking-tight whitespace-nowrap">PixelPanel</h1>
          </transition>
        </div>
        <button class="hidden md:block text-secondary hover:text-primary transition-colors focus:outline-none" @click="toggleSidebar">
          <svg v-if="!isSidebarCollapsed" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
          <svg v-else class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
        </button>
      </div>
      
      <nav class="p-3 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
        <router-link to="/" class="flex items-center px-3 py-2.5 rounded-lg text-secondary hover:bg-surface-hover hover:text-primary transition-colors group relative" active-class="bg-surface-hover text-primary font-medium border-l-2 border-accent">
          <svg class="w-5 h-5 shrink-0" :class="isSidebarCollapsed ? 'mx-auto' : 'mr-3'" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
          <transition name="fade"><span v-if="!isSidebarCollapsed">Dashboard</span></transition>
          <!-- Tooltip for collapsed mode -->
          <div v-if="isSidebarCollapsed" class="absolute left-full ml-2 px-2 py-1 bg-surface border border-border rounded text-xs text-primary opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">Dashboard</div>
        </router-link>

        <router-link to="/apps" class="flex items-center px-3 py-2.5 rounded-lg text-secondary hover:bg-surface-hover hover:text-primary transition-colors group relative" active-class="bg-surface-hover text-primary font-medium border-l-2 border-accent">
          <svg class="w-5 h-5 shrink-0" :class="isSidebarCollapsed ? 'mx-auto' : 'mr-3'" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
          <transition name="fade"><span v-if="!isSidebarCollapsed">Applications</span></transition>
          <div v-if="isSidebarCollapsed" class="absolute left-full ml-2 px-2 py-1 bg-surface border border-border rounded text-xs text-primary opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">Applications</div>
        </router-link>

        <router-link to="/marketplace" class="flex items-center px-3 py-2.5 rounded-lg text-secondary hover:bg-surface-hover hover:text-primary transition-colors group relative" active-class="bg-surface-hover text-primary font-medium border-l-2 border-accent">
          <svg class="w-5 h-5 shrink-0" :class="isSidebarCollapsed ? 'mx-auto' : 'mr-3'" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
          <transition name="fade"><span v-if="!isSidebarCollapsed">Marketplace</span></transition>
          <div v-if="isSidebarCollapsed" class="absolute left-full ml-2 px-2 py-1 bg-surface border border-border rounded text-xs text-primary opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">Marketplace</div>
        </router-link>

        <router-link to="/databases" class="flex items-center px-3 py-2.5 rounded-lg text-secondary hover:bg-surface-hover hover:text-primary transition-colors group relative" active-class="bg-surface-hover text-primary font-medium border-l-2 border-accent">
          <svg class="w-5 h-5 shrink-0" :class="isSidebarCollapsed ? 'mx-auto' : 'mr-3'" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
          <transition name="fade"><span v-if="!isSidebarCollapsed">Databases</span></transition>
          <div v-if="isSidebarCollapsed" class="absolute left-full ml-2 px-2 py-1 bg-surface border border-border rounded text-xs text-primary opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">Databases</div>
        </router-link>

        <router-link to="/monitoring" class="flex items-center px-3 py-2.5 rounded-lg text-secondary hover:bg-surface-hover hover:text-primary transition-colors group relative" active-class="bg-surface-hover text-primary font-medium border-l-2 border-accent">
          <svg class="w-5 h-5 shrink-0" :class="isSidebarCollapsed ? 'mx-auto' : 'mr-3'" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          <transition name="fade"><span v-if="!isSidebarCollapsed">Monitoring</span></transition>
          <div v-if="isSidebarCollapsed" class="absolute left-full ml-2 px-2 py-1 bg-surface border border-border rounded text-xs text-primary opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">Monitoring</div>
        </router-link>

        <router-link to="/settings" class="flex items-center px-3 py-2.5 rounded-lg text-secondary hover:bg-surface-hover hover:text-primary transition-colors group relative" active-class="bg-surface-hover text-primary font-medium border-l-2 border-accent">
          <svg class="w-5 h-5 shrink-0" :class="isSidebarCollapsed ? 'mx-auto' : 'mr-3'" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          <transition name="fade"><span v-if="!isSidebarCollapsed">Settings</span></transition>
          <div v-if="isSidebarCollapsed" class="absolute left-full ml-2 px-2 py-1 bg-surface border border-border rounded text-xs text-primary opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">Settings</div>
        </router-link>
      </nav>
    </aside>

    <div class="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
      <!-- Navbar -->
      <header v-if="isAuthenticated" class="h-16 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 lg:px-8 z-10 sticky top-0">
        <div class="flex items-center">
          <button class="md:hidden text-secondary hover:text-primary p-2 mr-2" @click="isMobileMenuOpen = true">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          
          <!-- Command Palette Trigger -->
          <button @click="openCommandPalette" class="hidden sm:flex items-center text-sm text-secondary bg-surface border border-border rounded-lg px-3 py-1.5 hover:border-secondary transition-colors group">
            <svg class="w-4 h-4 mr-2 text-secondary group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            Search or jump to...
            <kbd class="ml-8 hidden lg:inline-block px-1.5 py-0.5 rounded border border-border bg-background text-[10px] font-mono text-secondary group-hover:text-primary transition-colors">Ctrl+K</kbd>
          </button>
        </div>

        <div class="flex items-center space-x-4">
          <NotificationCenter />

          <!-- Theme Toggle -->
          <button @click="toggleTheme" class="text-secondary hover:text-primary transition-colors focus:outline-none p-1">
            <svg v-if="isDark" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
            <svg v-else class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
          </button>

          <!-- User Menu Dropdown (simplified) -->
          <div class="relative">
            <button class="flex items-center space-x-2 p-1 border border-border rounded-full hover:border-secondary transition-colors focus:outline-none spring-hover">
              <div class="w-7 h-7 rounded-full bg-gradient-to-tr from-accent to-purple-500 flex items-center justify-center text-xs font-bold text-white">A</div>
            </button>
          </div>
          
          <button @click="logout" class="text-sm font-medium text-secondary hover:text-primary transition-colors">Logout</button>
        </div>
      </header>
      
      <!-- Main Content -->
      <main class="flex-1 overflow-y-auto relative p-4 lg:p-8 pb-20 md:pb-8 hardware-accelerated">
        <router-view v-slot="{ Component }">
          <transition name="slide-up" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>

    <!-- PWA Bottom Navigation (Mobile Only) -->
    <nav v-if="isAuthenticated" class="md:hidden fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-md border-t border-border z-40 flex justify-around items-center h-16 pb-safe hardware-accelerated shadow-[0_-4px_15px_rgba(0,0,0,0.2)]">
      <router-link to="/" class="flex flex-col items-center justify-center w-full h-full text-secondary hover:text-primary transition-colors" active-class="text-accent">
        <svg class="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
        <span class="text-[10px] font-medium">Home</span>
      </router-link>
      <router-link to="/apps" class="flex flex-col items-center justify-center w-full h-full text-secondary hover:text-primary transition-colors" active-class="text-accent">
        <svg class="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
        <span class="text-[10px] font-medium">Apps</span>
      </router-link>
      <router-link to="/marketplace" class="flex flex-col items-center justify-center w-full h-full text-secondary hover:text-primary transition-colors" active-class="text-accent">
        <svg class="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
        <span class="text-[10px] font-medium">Store</span>
      </router-link>
      <router-link to="/databases" class="flex flex-col items-center justify-center w-full h-full text-secondary hover:text-primary transition-colors" active-class="text-accent">
        <svg class="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
        <span class="text-[10px] font-medium">DBs</span>
      </router-link>
      <router-link to="/monitoring" class="flex flex-col items-center justify-center w-full h-full text-secondary hover:text-primary transition-colors" active-class="text-accent">
        <svg class="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
        <span class="text-[10px] font-medium">Stats</span>
      </router-link>
    </nav>


    <CommandPalette v-if="isCommandPaletteOpen" @close="isCommandPaletteOpen = false" />
    <AiAssistant />
    <ContextMenu />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSwipe } from '@vueuse/core'
import CommandPalette from './components/CommandPalette.vue'
import NotificationCenter from './components/NotificationCenter.vue'
import AiAssistant from './components/AiAssistant.vue'
import ContextMenu from './components/ContextMenu.vue'
import { useDark, useToggle } from '@vueuse/core'

const router = useRouter()
const appContainer = ref(null)

const isDark = useDark()
const toggleTheme = useToggle(isDark)

const isSidebarCollapsed = ref(false)
const isMobileMenuOpen = ref(false)
const isCommandPaletteOpen = ref(false)

// In a real app, use Pinia store for auth state
const isAuthenticated = computed(() => {
  return !!localStorage.getItem('pixelpanel_token')
})

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}

const openCommandPalette = () => {
  isCommandPaletteOpen.value = true
}

const handleKeydown = (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    isCommandPaletteOpen.value = true
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

const logout = () => {
  localStorage.removeItem('pixelpanel_token')
  router.push('/login')
}

// Touch Gestures for PWA
const { direction } = useSwipe(appContainer, {
  onSwipeEnd: (e, direction) => {
    // Vibrate lightly on swipe
    if (navigator.vibrate) navigator.vibrate(10)

    if (direction === 'right') {
      router.back()
    }
  }
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.hardware-accelerated {
  transform: translateZ(0);
  will-change: transform, opacity;
}
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
</style>
