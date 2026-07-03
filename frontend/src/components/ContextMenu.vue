<template>
  <Teleport to="body">
    <transition name="scale-in">
      <div 
        v-if="contextMenuState.isOpen"
        class="fixed z-[100] w-48 glass-panel rounded-xl py-1 overflow-hidden shadow-2xl border border-border"
        :style="{ top: `${contextMenuState.y}px`, left: `${contextMenuState.x}px` }"
        @click.stop
      >
        <button
          v-for="(item, index) in contextMenuState.items"
          :key="index"
          @click="handleAction(item)"
          class="w-full text-left px-4 py-2 text-sm text-primary hover:bg-accent/20 hover:text-accent transition-colors flex items-center group"
        >
          <span v-if="item.icon" class="mr-2" v-html="item.icon"></span>
          {{ item.label }}
        </button>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { contextMenuState } from '../store/contextMenu'

const handleAction = (item) => {
  if (item.action) {
    item.action()
  }
  contextMenuState.close()
}

// Close menu when clicking outside
const handleClickOutside = () => {
  if (contextMenuState.isOpen) {
    contextMenuState.close()
  }
}

onMounted(() => {
  window.addEventListener('click', handleClickOutside)
  window.addEventListener('scroll', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside)
  window.removeEventListener('scroll', handleClickOutside)
})
</script>
