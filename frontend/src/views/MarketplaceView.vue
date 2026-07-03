<template>
  <div class="space-y-8 animate-fade-in relative">
    <div class="flex justify-between items-end">
      <div>
        <h1 class="text-3xl font-bold text-primary mb-2">Marketplace</h1>
        <p class="text-secondary text-sm">Deploy applications instantly with 1-Click native setups.</p>
      </div>
      <!-- Filter / Search could go here -->
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <div v-for="i in 8" :key="i" class="glass-panel p-6 animate-pulse">
        <div class="w-12 h-12 bg-border rounded-xl mb-4"></div>
        <div class="h-6 bg-border rounded w-1/2 mb-2"></div>
        <div class="h-4 bg-border rounded w-3/4 mb-4"></div>
        <div class="flex gap-2">
          <div class="h-6 bg-border rounded w-16"></div>
          <div class="h-6 bg-border rounded w-16"></div>
        </div>
      </div>
    </div>

    <!-- Template Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <div 
        v-for="template in templates" 
        :key="template.id"
        class="glass-panel p-6 glass-panel-hover flex flex-col justify-between group cursor-pointer transition-all hover:-translate-y-1"
      >
        <div>
          <div class="flex items-center justify-between mb-4">
            <div class="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2 shadow-sm border border-border/50">
              <img :src="template.icon" :alt="template.name" class="w-full h-full object-contain" @error="$event.target.src='https://ui-avatars.com/api/?name='+template.name+'&background=random'" />
            </div>
            <span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent/10 text-accent border border-accent/20">
              {{ template.category }}
            </span>
          </div>
          
          <h3 class="text-xl font-bold text-primary mb-2 group-hover:text-accent transition-colors">{{ template.name }}</h3>
          <p class="text-sm text-secondary line-clamp-2 mb-6">{{ template.description }}</p>
        </div>

        <div>
          <!-- Stats Grid -->
          <div class="grid grid-cols-2 gap-2 mb-4">
            <div class="bg-background rounded-lg p-2 text-center border border-border">
              <div class="text-[10px] text-secondary uppercase font-semibold">EST. RAM</div>
              <div class="text-xs text-primary font-bold">{{ template.estimatedRam }}</div>
            </div>
            <div class="bg-background rounded-lg p-2 text-center border border-border">
              <div class="text-[10px] text-secondary uppercase font-semibold">TIME</div>
              <div class="text-xs text-primary font-bold">{{ template.deployTime }}</div>
            </div>
          </div>

          <button @click="openDeployModal(template)" class="w-full bg-accent text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-accent-hover transition-colors shadow-lg shadow-accent/20">
            1-Click Deploy
          </button>
        </div>
      </div>
    </div>

    <!-- Deploy Modal -->
    <transition name="fade">
      <div v-if="selectedTemplate" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-background/80 backdrop-blur-sm" @click="closeModal"></div>
        <div class="relative bg-surface border border-border p-6 rounded-2xl w-full max-w-md shadow-2xl">
          <div class="flex items-center space-x-4 mb-6 pb-4 border-b border-border">
            <img :src="selectedTemplate.icon" class="w-10 h-10 rounded bg-white p-1" @error="$event.target.src='https://ui-avatars.com/api/?name='+selectedTemplate.name" />
            <div>
              <h2 class="text-xl font-bold text-primary">Deploy {{ selectedTemplate.name }}</h2>
              <p class="text-xs text-secondary">Configure your new deployment</p>
            </div>
          </div>

          <form @submit.prevent="deployTemplate">
            <div class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-secondary mb-1">Application Name</label>
                <input v-model="deployForm.appName" type="text" required pattern="[a-zA-Z0-9-]+" title="Only alphanumeric characters and hyphens" class="w-full bg-background border border-border rounded-lg px-3 py-2 text-primary focus:border-accent focus:ring-1 focus:ring-accent transition-all text-sm" placeholder="my-awesome-app" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-secondary mb-1">Domain Name (for automated SSL)</label>
                <input v-model="deployForm.domain" type="text" required class="w-full bg-background border border-border rounded-lg px-3 py-2 text-primary focus:border-accent focus:ring-1 focus:ring-accent transition-all text-sm" placeholder="app.example.com" />
              </div>
            </div>

            <div class="mt-8 flex space-x-3">
              <button type="button" @click="closeModal" class="flex-1 px-4 py-2 text-secondary bg-background border border-border rounded-lg hover:bg-border transition-colors text-sm font-medium">Cancel</button>
              <button type="submit" :disabled="isDeploying" class="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors text-sm font-medium shadow-lg shadow-accent/20 flex justify-center items-center">
                <span v-if="!isDeploying">Deploy Now</span>
                <svg v-else class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              </button>
            </div>
          </form>

          <!-- Live Progress Overlay -->
          <transition name="fade">
            <div v-if="isDeploying" class="absolute inset-0 bg-surface/95 backdrop-blur rounded-2xl flex flex-col items-center justify-center p-8 text-center z-10 border border-border">
              <div class="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mb-6"></div>
              <h3 class="text-xl font-bold text-primary mb-2">Deploying {{ selectedTemplate.name }}...</h3>
              <p class="text-sm text-secondary mb-8">{{ deployStatus }}</p>
              
              <div class="w-full bg-background rounded-full h-2 overflow-hidden border border-border">
                <div class="bg-accent h-full transition-all duration-500 ease-out" :style="{ width: deployProgress + '%' }"></div>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { io } from 'socket.io-client'

const router = useRouter()
const templates = ref([])
const loading = ref(true)

const selectedTemplate = ref(null)
const deployForm = ref({ appName: '', domain: '' })
const isDeploying = ref(false)
const deployStatus = ref('Initializing...')
const deployProgress = ref(0)
let socket = null

onMounted(async () => {
  await fetchTemplates()
  setupSocket()
})

onUnmounted(() => {
  if (socket) socket.disconnect()
})

const fetchTemplates = async () => {
  try {
    const res = await fetch('http://localhost:3000/api/templates', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('pixelpanel_token')}` }
    })
    templates.value = await res.json()
  } catch (error) {
    console.error('Failed to load templates:', error)
  } finally {
    loading.value = false
  }
}

const setupSocket = () => {
  socket = io('http://localhost:3000')
  
  socket.on('marketplace:progress', (data) => {
    if (data.appName === deployForm.value.appName) {
      deployStatus.value = data.status
      deployProgress.value = data.progress
    }
  })

  socket.on('marketplace:success', (data) => {
    if (data.appName === deployForm.value.appName) {
      isDeploying.value = false
      closeModal()
      router.push(`/apps/${data.id}`)
    }
  })
}

const openDeployModal = (template) => {
  selectedTemplate.value = template
  deployForm.value = { appName: '', domain: '' }
}

const closeModal = () => {
  if (isDeploying.value) return // Prevent closing while deploying
  selectedTemplate.value = null
}

const deployTemplate = async () => {
  if (!deployForm.value.appName || !deployForm.value.domain) return
  
  isDeploying.value = true
  deployStatus.value = 'Preparing environment...'
  deployProgress.value = 5

  try {
    const res = await fetch('http://localhost:3000/api/templates/deploy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('pixelpanel_token')}`
      },
      body: JSON.stringify({
        templateId: selectedTemplate.value.id,
        appName: deployForm.value.appName,
        domain: deployForm.value.domain
      })
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Deployment failed to start')
    }
    // Progress will now be tracked via Socket.io
  } catch (error) {
    console.error(error)
    alert(error.message)
    isDeploying.value = false
  }
}
</script>
