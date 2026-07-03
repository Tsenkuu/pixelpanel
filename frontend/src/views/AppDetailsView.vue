<template>
  <div class="space-y-6 animate-fade-in pb-10">
    <div class="flex items-center justify-between">
      <div class="flex items-center">
        <router-link to="/apps" class="mr-4 text-secondary hover:text-primary transition-colors">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </router-link>
        <div>
          <h2 class="text-2xl font-bold text-primary tracking-tight">App Details</h2>
          <p class="text-sm text-secondary mt-1">Manage, monitor, and deploy.</p>
        </div>
      </div>
      <div class="flex space-x-2">
        <button class="btn-secondary">Settings</button>
        <button @click="triggerDeploy" :disabled="isDeploying" class="btn-primary flex items-center">
          <svg v-if="!isDeploying" class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          <svg v-else class="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          {{ isDeploying ? 'Deploying...' : 'Redeploy' }}
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <!-- Deployment Timeline & Git History -->
      <div class="lg:col-span-1 space-y-6">
        <div class="glass-panel p-5">
          <h3 class="text-primary font-semibold mb-4">Deployment Timeline</h3>
          <div class="relative border-l border-border ml-3 space-y-6 pb-2" v-if="deployments.length > 0">
            <div v-for="deploy in deployments" :key="deploy.id" class="relative pl-6">
              <span class="absolute -left-2 top-1.5 w-4 h-4 rounded-full bg-surface border-2" 
                    :class="{
                      'border-success': deploy.status === 'success',
                      'border-error': deploy.status === 'failed',
                      'border-amber-400 animate-pulse': deploy.status === 'building'
                    }"></span>
              <div class="flex justify-between items-start">
                <div>
                  <p class="text-sm font-medium text-primary capitalize flex items-center">
                    {{ deploy.status }}
                    <span v-if="deploy.status === 'success'" class="ml-2 text-[10px] text-success bg-success/10 px-2 py-0.5 rounded-full">Live</span>
                  </p>
                  <p class="text-xs text-secondary mt-1 font-mono" v-if="deploy.commit_hash">Commit: {{ deploy.commit_hash.substring(0,7) }}</p>
                  <p class="text-xs text-secondary mt-1">Started: {{ new Date(deploy.started_at).toLocaleString() }}</p>
                </div>
                <button v-if="deploy.status === 'success'" @click="rollback(deploy.id)" class="px-2 py-1 bg-background border border-border rounded text-xs text-secondary hover:text-primary hover:border-accent transition-colors" title="Rollback to this deployment">
                  Rollback
                </button>
              </div>
            </div>
          </div>
          <div v-else class="text-sm text-secondary text-center py-4">No deployments yet.</div>
        </div>

        <div class="glass-panel p-5">
          <h3 class="text-primary font-semibold mb-4">Git Commit History</h3>
          <div v-if="commits.length > 0" class="space-y-4">
            <div v-for="commit in commits" :key="commit.hash" class="border-b border-border last:border-b-0 pb-3 last:pb-0">
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-primary truncate max-w-[200px]">{{ commit.message }}</span>
                <span class="text-xs font-mono text-secondary">{{ commit.hash.substring(0, 7) }}</span>
              </div>
              <div class="flex items-center justify-between mt-1">
                <span class="text-xs text-secondary">{{ commit.author_name }}</span>
                <span class="text-xs text-secondary">{{ new Date(commit.date).toLocaleDateString() }}</span>
              </div>
            </div>
          </div>
          <div v-else class="text-sm text-secondary text-center py-4">
            No git history available
          </div>
        </div>
      </div>

      <!-- Realtime Logs (xterm.js) -->
      <div class="lg:col-span-2">
        <div class="glass-panel p-1 h-full min-h-[500px] flex flex-col overflow-hidden bg-black/90">
          <div class="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-[#0f0f0f]">
            <div class="flex items-center space-x-2">
              <svg class="w-4 h-4 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M4 15h16M4 9h16M4 20h16M4 4h16" /></svg>
              <span class="text-xs font-mono text-secondary">Realtime Logs (PM2)</span>
            </div>
            <button class="text-xs text-secondary hover:text-primary transition-colors">Clear</button>
          </div>
          <div class="flex-1 w-full h-full relative p-2" ref="terminalContainer">
            <!-- Terminal gets mounted here -->
          </div>
        </div>
      </div>
      
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { Terminal } from 'xterm'
import 'xterm/css/xterm.css'

const route = useRoute()
const terminalContainer = ref(null)
const term = ref(null)
const commits = ref([])
const deployments = ref([])
const isDeploying = ref(false)

const fetchGitHistory = async () => {
  try {
    const res = await fetch(`http://localhost:3000/api/apps/${route.params.id}/history`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('pixelpanel_token')}` }
    })
    if (res.ok) {
      commits.value = await res.json()
    }
  } catch (e) {
    console.error('Failed to fetch history', e)
  }
}

const fetchDeployments = async () => {
  try {
    const res = await fetch(`http://localhost:3000/api/apps/${route.params.id}/deployments`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('pixelpanel_token')}` }
    })
    if (res.ok) deployments.value = await res.json()
  } catch (e) { console.error('Failed to fetch deployments', e) }
}

const triggerDeploy = async () => {
  isDeploying.value = true
  try {
    await fetch(`http://localhost:3000/api/apps/${route.params.id}/deploy`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('pixelpanel_token')}` }
    })
    // Simulate refreshing deployments timeline
    setTimeout(fetchDeployments, 1500)
    setTimeout(() => { isDeploying.value = false }, 2000)
  } catch (e) {
    isDeploying.value = false
  }
}

const rollback = async (deploymentId) => {
  if (!confirm('Are you sure you want to instantly rollback to this deployment?')) return
  try {
    await fetch(`http://localhost:3000/api/apps/${route.params.id}/deployments/${deploymentId}/rollback`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('pixelpanel_token')}` }
    })
    alert('Rollback successful!')
    fetchDeployments()
  } catch (e) {
    alert('Rollback failed: ' + e.message)
  }
}

onMounted(() => {
  fetchGitHistory()
  fetchDeployments()

  // Initialize xterm
  term.value = new Terminal({
    theme: {
      background: 'transparent',
      foreground: '#a1a1aa', // tailwind zinc-400
      cursor: '#3b82f6', // tailwind blue-500
    },
    fontFamily: '"Fira Code", monospace',
    fontSize: 13,
    lineHeight: 1.4,
    cursorBlink: true,
  })
  
  if (terminalContainer.value) {
    term.value.open(terminalContainer.value)
    
    // Welcome message
    term.value.writeln('\x1b[1;36m[PixelPanel]\x1b[0m Connected to log stream for app.')
    term.value.writeln('\x1b[1;30mFetching logs from PM2...\x1b[0m\r\n')
    
    // Mock incoming logs for the UI showcase
    let counter = 0
    const logInterval = setInterval(() => {
      counter++
      const timestamp = new Date().toISOString()
      if (counter % 5 === 0) {
        term.value.writeln(`\x1b[90m${timestamp}\x1b[0m \x1b[32mINFO\x1b[0m Request received GET /api/status`)
      } else if (counter % 12 === 0) {
        term.value.writeln(`\x1b[90m${timestamp}\x1b[0m \x1b[33mWARN\x1b[0m Memory usage climbing`)
      } else {
        term.value.writeln(`\x1b[90m${timestamp}\x1b[0m \x1b[34mDEBUG\x1b[0m DB connection active [pool: ${Math.floor(Math.random()*10)}]`)
      }
    }, 2000)

    // Store interval to clear it later
    term.value._logInterval = logInterval
  }
})

onUnmounted(() => {
  if (term.value) {
    if (term.value._logInterval) clearInterval(term.value._logInterval)
    term.value.dispose()
  }
})
</script>

<style>
/* Adjust xterm container to fill parent */
.xterm {
  height: 100%;
  padding: 8px;
}
.xterm-viewport {
  overflow-y: auto !important;
}
/* Custom scrollbar for xterm */
.xterm-viewport::-webkit-scrollbar {
  width: 6px;
}
.xterm-viewport::-webkit-scrollbar-track {
  background: transparent; 
}
.xterm-viewport::-webkit-scrollbar-thumb {
  background: #333333; 
  border-radius: 3px;
}
</style>
