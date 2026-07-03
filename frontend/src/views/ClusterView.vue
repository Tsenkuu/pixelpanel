<template>
  <div class="space-y-6 animate-fade-in">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-primary">Node Cluster</h2>
        <p class="text-sm text-secondary mt-1">Manage your distributed infrastructure</p>
      </div>
      <button @click="showAddNodeModal = true" class="btn-primary flex items-center spring-hover">
        <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        Add Node
      </button>
    </div>

    <!-- Cluster Health Cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="glass-panel rounded-xl p-4 mesh-gradient">
        <div class="text-xs text-secondary uppercase tracking-wider font-bold">Total Nodes</div>
        <div class="text-3xl font-bold text-primary mt-1">{{ health.totalNodes }}</div>
      </div>
      <div class="glass-panel rounded-xl p-4">
        <div class="text-xs text-secondary uppercase tracking-wider font-bold">Online</div>
        <div class="text-3xl font-bold text-success mt-1">{{ health.onlineCount }}</div>
      </div>
      <div class="glass-panel rounded-xl p-4">
        <div class="text-xs text-secondary uppercase tracking-wider font-bold">Offline</div>
        <div class="text-3xl font-bold text-error mt-1">{{ health.offlineCount }}</div>
      </div>
      <div class="glass-panel rounded-xl p-4">
        <div class="text-xs text-secondary uppercase tracking-wider font-bold">Avg CPU</div>
        <div class="text-3xl font-bold text-accent mt-1">{{ health.avgCpuLoad }}%</div>
      </div>
    </div>

    <!-- Node Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        v-for="node in nodes" 
        :key="node.id"
        @click="router.push(`/cluster/${node.id}`)"
        @contextmenu.prevent="openNodeContextMenu($event, node)"
        class="relative group spring-hover cursor-pointer"
      >
        <!-- Mesh Gradient Border -->
        <div class="absolute -inset-[1px] bg-gradient-to-r from-[rgba(var(--mesh-1),0.4)] via-[rgba(var(--mesh-2),0.4)] to-[rgba(var(--mesh-3),0.4)] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

        <div class="relative glass-panel rounded-xl p-5 z-10">
          <!-- Header -->
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center">
              <!-- Status Indicator -->
              <div class="relative mr-3">
                <div class="w-3 h-3 rounded-full" :class="{
                  'bg-success': node.status === 'online',
                  'bg-error': node.status === 'offline',
                  'bg-warning': node.status === 'maintenance' || node.status === 'drain'
                }"></div>
                <div v-if="node.status === 'online'" class="absolute inset-0 w-3 h-3 rounded-full bg-success animate-ping opacity-75"></div>
              </div>
              <div>
                <h3 class="text-base font-bold text-primary">{{ node.name }}</h3>
                <p class="text-xs text-secondary">{{ node.host }}:{{ node.port }}</p>
              </div>
            </div>
            <div class="flex items-center space-x-1">
              <span v-if="node.is_favorite" class="text-warning text-sm">★</span>
              <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full" :class="{
                'bg-success/20 text-success': node.status === 'online',
                'bg-error/20 text-error': node.status === 'offline',
                'bg-warning/20 text-warning': node.status === 'drain'
              }">{{ node.status }}</span>
            </div>
          </div>

          <!-- Metrics (if online) -->
          <div v-if="node.metrics" class="grid grid-cols-3 gap-3 mt-3">
            <div class="text-center">
              <div class="text-lg font-bold text-primary">{{ node.metrics.cpu?.load?.toFixed(0) || 0 }}%</div>
              <div class="text-[10px] uppercase tracking-wider text-secondary">CPU</div>
            </div>
            <div class="text-center">
              <div class="text-lg font-bold text-primary">{{ formatBytes(node.metrics.ram?.used) }}</div>
              <div class="text-[10px] uppercase tracking-wider text-secondary">RAM</div>
            </div>
            <div class="text-center">
              <div class="text-lg font-bold text-primary">{{ node.metrics.temperature?.toFixed(0) || '--' }}°</div>
              <div class="text-[10px] uppercase tracking-wider text-secondary">Temp</div>
            </div>
          </div>

          <!-- Tags -->
          <div v-if="node.tags && JSON.parse(node.tags || '[]').length > 0" class="flex flex-wrap gap-1 mt-3 pt-3 border-t border-border/50">
            <span v-for="tag in JSON.parse(node.tags)" :key="tag" class="text-[10px] px-2 py-0.5 bg-accent/10 text-accent rounded-full">{{ tag }}</span>
          </div>

          <!-- Group & Arch -->
          <div class="flex justify-between items-center mt-3 pt-3 border-t border-border/50">
            <span class="text-[10px] text-secondary">{{ node.group_name || 'Default' }} · {{ node.arch || 'unknown' }}</span>
            <span class="text-[10px] text-secondary/50 hidden group-hover:block">Right-click for options</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="nodes.length === 0" class="glass-panel rounded-2xl p-12 text-center mesh-gradient">
      <svg class="mx-auto h-16 w-16 text-secondary/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
      <h3 class="mt-4 text-lg font-semibold text-primary">No nodes registered</h3>
      <p class="mt-2 text-sm text-secondary max-w-md mx-auto">
        Add your first remote server to start building a cluster. Install the PixelPanel Agent on any ARM64, Raspberry Pi, or VPS.
      </p>
      <button @click="showAddNodeModal = true" class="btn-primary mt-6 spring-hover">
        Add Your First Node
      </button>
    </div>

    <!-- Add Node Modal -->
    <div v-if="showAddNodeModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div class="glass-panel rounded-2xl p-6 w-full max-w-md shadow-2xl animate-scale-in">
        <h3 class="text-xl font-bold text-primary mb-4">Register New Node</h3>
        <form @submit.prevent="addNode" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-secondary mb-1">Node Name</label>
            <input v-model="newNode.name" type="text" required class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-primary focus:ring-2 focus:ring-accent outline-none transition-all" placeholder="raspberry-pi-01">
          </div>
          <div>
            <label class="block text-sm font-medium text-secondary mb-1">Host / IP Address</label>
            <input v-model="newNode.host" type="text" required class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-primary focus:ring-2 focus:ring-accent outline-none transition-all" placeholder="192.168.1.100">
          </div>
          <div>
            <label class="block text-sm font-medium text-secondary mb-1">Agent Port</label>
            <input v-model.number="newNode.port" type="number" class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-primary focus:ring-2 focus:ring-accent outline-none transition-all" placeholder="3001">
          </div>
          <div class="flex justify-end space-x-3 mt-6">
            <button type="button" @click="showAddNodeModal = false" class="btn-secondary">Cancel</button>
            <button type="submit" class="btn-primary">Register Node</button>
          </div>
        </form>

        <!-- Token Display (after registration) -->
        <div v-if="registeredToken" class="mt-6 p-4 bg-surface rounded-lg border border-accent/30">
          <p class="text-xs text-secondary mb-2">Install the agent on your server and use this token:</p>
          <code class="text-xs text-accent break-all font-mono">{{ registeredToken }}</code>
          <button @click="copyToken" class="mt-2 text-xs text-accent hover:text-accent-hover transition-colors">Copy to Clipboard</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { contextMenuState } from '../store/contextMenu'

const router = useRouter()
const nodes = ref([])
const health = ref({ totalNodes: 0, onlineCount: 0, offlineCount: 0, avgCpuLoad: 0 })
const showAddNodeModal = ref(false)
const registeredToken = ref('')
const newNode = ref({ name: '', host: '', port: 3001 })

let pollInterval = null

const fetchNodes = async () => {
  try {
    const res = await fetch('/api/cluster/nodes', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('pixelpanel_token')}` }
    })
    if (res.ok) nodes.value = await res.json()
  } catch (e) { console.error('Fetch nodes error:', e) }
}

const fetchHealth = async () => {
  try {
    const res = await fetch('/api/cluster/health', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('pixelpanel_token')}` }
    })
    if (res.ok) health.value = await res.json()
  } catch (e) { console.error('Fetch health error:', e) }
}

const addNode = async () => {
  try {
    const res = await fetch('/api/cluster/nodes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('pixelpanel_token')}`
      },
      body: JSON.stringify(newNode.value)
    })
    if (res.ok) {
      const data = await res.json()
      registeredToken.value = data.token
      newNode.value = { name: '', host: '', port: 3001 }
      fetchNodes()
      fetchHealth()
    }
  } catch (e) { console.error('Add node error:', e) }
}

const copyToken = () => {
  navigator.clipboard.writeText(registeredToken.value)
}

const formatBytes = (bytes) => {
  if (!bytes) return '0'
  const gb = bytes / 1024 / 1024 / 1024
  if (gb >= 1) return `${gb.toFixed(1)}G`
  const mb = bytes / 1024 / 1024
  return `${mb.toFixed(0)}M`
}

const openNodeContextMenu = (event, node) => {
  contextMenuState.open(event, [
    {
      label: 'View Details',
      icon: '<svg class="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>',
      action: () => router.push(`/cluster/${node.id}`)
    },
    {
      label: 'Open Terminal',
      icon: '<svg class="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>',
      action: () => router.push(`/cluster/${node.id}/terminal`)
    },
    {
      label: node.status === 'drain' ? 'Activate Node' : 'Drain Node',
      icon: '<svg class="w-4 h-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.07 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>',
      action: () => toggleDrain(node)
    },
    {
      label: 'Reboot',
      icon: '<svg class="w-4 h-4 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>',
      action: () => rebootNode(node.id)
    }
  ])
}

const toggleDrain = async (node) => {
  const endpoint = node.status === 'drain' ? 'activate' : 'drain'
  await fetch(`/api/cluster/nodes/${node.id}/${endpoint}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${localStorage.getItem('pixelpanel_token')}` }
  })
  fetchNodes()
}

const rebootNode = async (nodeId) => {
  if (!confirm('Are you sure you want to reboot this node?')) return
  await fetch(`/api/cluster/nodes/${nodeId}/reboot`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${localStorage.getItem('pixelpanel_token')}` }
  })
}

onMounted(() => {
  fetchNodes()
  fetchHealth()
  pollInterval = setInterval(() => {
    fetchNodes()
    fetchHealth()
  }, 10000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})
</script>
