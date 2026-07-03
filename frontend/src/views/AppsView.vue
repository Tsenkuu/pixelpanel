<template>
  <div class="space-y-6 animate-fade-in">
    <div class="flex items-center justify-between">
      <h2 class="text-2xl font-bold text-white">Applications</h2>
      <button @click="showCreateModal = true" class="bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center">
        <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        New App
      </button>
    </div>

    <!-- App List (Virtualized for Extreme Performance) -->
    <div v-if="apps.length > 0" class="h-[calc(100vh-200px)]">
      <RecycleScroller
        class="scroller h-full"
        :items="apps"
        :item-size="220"
        key-field="id"
        v-slot="{ item }"
      >
        <div class="pb-6">
          <AppCard 
            :app="item"
            @click="router.push(`/apps/${item.id}`)"
            @action="(action) => actionApp(item.id, action)"
            @delete="deleteApp(item.id)"
          />
        </div>
      </RecycleScroller>
    </div>

    <!-- Empty State -->
    <div v-else class="bg-panel-card border border-slate-700/50 rounded-2xl p-12 text-center shadow-sm">
      <svg class="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
      <h3 class="mt-4 text-lg font-medium text-white">No applications deployed</h3>
      <p class="mt-1 text-slate-400">Get started by creating your first application.</p>
    </div>

    <!-- Create Modal (Simplified) -->
    <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div class="bg-panel-card border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 class="text-xl font-bold text-white mb-4">Deploy New Application</h3>
        <form @submit.prevent="createApp" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-1">App Name</label>
            <input v-model="newApp.name" type="text" required class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="my-awesome-api">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-1">Git Repository (Optional)</label>
            <input v-model="newApp.gitRepo" type="text" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="https://github.com/user/repo">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-1">Start Script</label>
            <input v-model="newApp.startScript" type="text" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="npm start">
          </div>
          <div class="flex justify-end space-x-3 mt-6">
            <button type="button" @click="showCreateModal = false" class="px-4 py-2 text-slate-300 hover:text-white transition-colors">Cancel</button>
            <button type="submit" class="bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-4 rounded-lg transition-colors">Deploy</button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppCard from '../components/AppCard.vue'

const router = useRouter()
const apps = ref([])
const showCreateModal = ref(false)
const newApp = ref({ name: '', gitRepo: '', startScript: 'npm start' })

const fetchApps = async () => {
  try {
    const res = await fetch('/api/apps', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('pixelpanel_token')}` }
    })
    if (res.ok) {
      apps.value = await res.json()
    }
  } catch (error) {
    console.error('Error fetching apps:', error)
  }
}

const createApp = async () => {
  try {
    const res = await fetch('/api/apps', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('pixelpanel_token')}`
      },
      body: JSON.stringify(newApp.value)
    })
    if (res.ok) {
      showCreateModal.value = false
      newApp.value = { name: '', gitRepo: '', startScript: 'npm start' }
      fetchApps()
    } else {
      alert((await res.json()).error)
    }
  } catch (error) {
    console.error(error)
  }
}

const deleteApp = async (id) => {
  if (!confirm('Are you sure you want to delete this app?')) return
  try {
    const res = await fetch(`/api/apps/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('pixelpanel_token')}` }
    })
    if (res.ok) fetchApps()
  } catch (e) {}
}

const actionApp = async (id, action) => {
  try {
    const res = await fetch(`/api/apps/${id}/action/${action}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('pixelpanel_token')}` }
    })
    if (res.ok) fetchApps()
  } catch (e) {}
}

onMounted(() => {
  fetchApps()
})
</script>
