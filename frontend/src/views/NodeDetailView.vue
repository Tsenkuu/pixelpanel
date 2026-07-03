<template>
  <div class="space-y-6 animate-fade-in">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center">
        <button @click="router.push('/cluster')" class="mr-3 text-secondary hover:text-primary transition-colors">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <div>
          <h2 class="text-2xl font-bold text-primary">{{ node?.name || 'Loading...' }}</h2>
          <p class="text-sm text-secondary">{{ node?.host }}:{{ node?.port }} · {{ node?.arch || 'unknown' }}</p>
        </div>
      </div>
      <div class="flex items-center space-x-2">
        <span class="text-xs uppercase font-bold tracking-wider px-3 py-1 rounded-full" :class="{
          'bg-success/20 text-success': node?.status === 'online',
          'bg-error/20 text-error': node?.status === 'offline',
          'bg-warning/20 text-warning': node?.status === 'drain'
        }">{{ node?.status }}</span>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="flex flex-wrap gap-2">
      <button @click="activeTab = 'overview'" :class="tabClass('overview')">Overview</button>
      <button @click="activeTab = 'pm2'" :class="tabClass('pm2')">PM2 Processes</button>
      <button @click="activeTab = 'files'" :class="tabClass('files')">Files</button>
      <button @click="activeTab = 'terminal'" :class="tabClass('terminal')">Terminal</button>
      <button @click="activeTab = 'monitoring'" :class="tabClass('monitoring')">Monitoring</button>
    </div>

    <!-- Overview Tab -->
    <div v-if="activeTab === 'overview'" class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="glass-panel rounded-xl p-4">
        <div class="text-xs text-secondary uppercase tracking-wider font-bold">CPU Load</div>
        <div class="text-3xl font-bold text-primary mt-1">{{ metrics?.cpu?.load?.toFixed(1) || 0 }}%</div>
        <div class="text-xs text-secondary mt-1">{{ metrics?.cpu?.cores || 0 }} cores @ {{ metrics?.cpu?.speed || 0 }} GHz</div>
      </div>
      <div class="glass-panel rounded-xl p-4">
        <div class="text-xs text-secondary uppercase tracking-wider font-bold">Memory</div>
        <div class="text-3xl font-bold text-primary mt-1">{{ formatBytes(metrics?.ram?.used) }}</div>
        <div class="text-xs text-secondary mt-1">of {{ formatBytes(metrics?.ram?.total) }}</div>
      </div>
      <div class="glass-panel rounded-xl p-4">
        <div class="text-xs text-secondary uppercase tracking-wider font-bold">Temperature</div>
        <div class="text-3xl font-bold mt-1" :class="tempColor">{{ metrics?.temperature?.toFixed(0) || '--' }}°C</div>
      </div>
      <div class="glass-panel rounded-xl p-4">
        <div class="text-xs text-secondary uppercase tracking-wider font-bold">Uptime</div>
        <div class="text-3xl font-bold text-primary mt-1">{{ formatUptime(metrics?.uptime) }}</div>
      </div>
      <div class="glass-panel rounded-xl p-4">
        <div class="text-xs text-secondary uppercase tracking-wider font-bold">Swap</div>
        <div class="text-xl font-bold text-primary mt-1">{{ formatBytes(metrics?.swap?.used) }} / {{ formatBytes(metrics?.swap?.total) }}</div>
      </div>
      <div class="glass-panel rounded-xl p-4">
        <div class="text-xs text-secondary uppercase tracking-wider font-bold">Network</div>
        <div class="text-xl font-bold text-primary mt-1">↓{{ formatBps(metrics?.network?.rx) }} ↑{{ formatBps(metrics?.network?.tx) }}</div>
      </div>
      <div class="glass-panel rounded-xl p-4">
        <div class="text-xs text-secondary uppercase tracking-wider font-bold">Load Average</div>
        <div class="text-xl font-bold text-primary mt-1">{{ metrics?.loadAvg?.map(v => v?.toFixed(2)).join(' / ') || '--' }}</div>
      </div>
      <div class="glass-panel rounded-xl p-4">
        <div class="text-xs text-secondary uppercase tracking-wider font-bold">Processes</div>
        <div class="text-xl font-bold text-primary mt-1">{{ metrics?.processes?.running || 0 }} / {{ metrics?.processes?.total || 0 }}</div>
      </div>
    </div>

    <!-- PM2 Tab -->
    <div v-if="activeTab === 'pm2'" class="space-y-4">
      <div v-for="proc in pm2Processes" :key="proc.pm_id" class="glass-panel rounded-xl p-4 flex items-center justify-between">
        <div class="flex items-center">
          <div class="w-2 h-2 rounded-full mr-3" :class="proc.status === 'online' ? 'bg-success' : 'bg-error'"></div>
          <div>
            <div class="font-bold text-primary">{{ proc.name }}</div>
            <div class="text-xs text-secondary">PID {{ proc.pm_id }} · {{ proc.status }} · {{ proc.restarts }} restarts</div>
          </div>
        </div>
        <div class="flex items-center space-x-4">
          <div class="text-xs text-secondary">CPU {{ proc.cpu?.toFixed(1) }}% · RAM {{ formatBytes(proc.memory) }}</div>
          <button @click="pm2Action('restart', proc.name)" class="text-xs text-accent hover:text-accent-hover transition-colors">Restart</button>
          <button @click="pm2Action('stop', proc.name)" class="text-xs text-warning hover:text-error transition-colors">Stop</button>
        </div>
      </div>
      <div v-if="pm2Processes.length === 0" class="text-center text-secondary py-8">No PM2 processes running on this node.</div>
    </div>

    <!-- Terminal Tab -->
    <div v-if="activeTab === 'terminal'" class="glass-panel rounded-xl p-1 h-[60vh]">
      <div ref="terminalContainer" class="w-full h-full rounded-lg overflow-hidden"></div>
    </div>

    <!-- Files Tab -->
    <div v-if="activeTab === 'files'" class="glass-panel rounded-xl p-4">
      <p class="text-secondary text-center py-8">Remote File Manager — Routed via Master → Agent WebSocket</p>
    </div>

    <!-- Monitoring Tab -->
    <div v-if="activeTab === 'monitoring'" class="glass-panel rounded-xl p-4">
      <p class="text-secondary text-center py-8">Real-time Monitoring Charts — Streaming via Agent Heartbeat</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const node = ref(null)
const metrics = ref(null)
const pm2Processes = ref([])
const activeTab = ref('overview')
const terminalContainer = ref(null)

let pollInterval = null

const tempColor = computed(() => {
  const t = metrics.value?.temperature || 0
  if (t > 80) return 'text-error'
  if (t > 60) return 'text-warning'
  return 'text-success'
})

const tabClass = (tab) => {
  return activeTab.value === tab
    ? 'px-4 py-2 rounded-lg text-sm font-medium bg-accent text-white transition-all'
    : 'px-4 py-2 rounded-lg text-sm font-medium text-secondary hover:text-primary hover:bg-surface-hover transition-all'
}

const fetchNode = async () => {
  try {
    const res = await fetch(`/api/cluster/nodes/${route.params.nodeId}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('pixelpanel_token')}` }
    })
    if (res.ok) {
      const data = await res.json()
      node.value = data
      metrics.value = data.metrics
    }
  } catch (e) { console.error(e) }
}

const fetchPm2 = async () => {
  try {
    const res = await fetch(`/api/remote/${route.params.nodeId}/pm2/list`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('pixelpanel_token')}` }
    })
    if (res.ok) pm2Processes.value = await res.json()
  } catch (e) { console.error(e) }
}

const pm2Action = async (action, name) => {
  await fetch(`/api/remote/${route.params.nodeId}/pm2/${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('pixelpanel_token')}`
    },
    body: JSON.stringify({ name })
  })
  setTimeout(fetchPm2, 1000)
}

const formatBytes = (bytes) => {
  if (!bytes) return '0'
  const gb = bytes / 1024 / 1024 / 1024
  if (gb >= 1) return `${gb.toFixed(1)} GB`
  const mb = bytes / 1024 / 1024
  return `${mb.toFixed(0)} MB`
}

const formatUptime = (seconds) => {
  if (!seconds) return '--'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  if (d > 0) return `${d}d ${h}h`
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

const formatBps = (bps) => {
  if (!bps) return '0'
  if (bps > 1024 * 1024) return `${(bps / 1024 / 1024).toFixed(1)} MB/s`
  if (bps > 1024) return `${(bps / 1024).toFixed(1)} KB/s`
  return `${bps.toFixed(0)} B/s`
}

watch(activeTab, (tab) => {
  if (tab === 'pm2') fetchPm2()
})

onMounted(() => {
  fetchNode()
  pollInterval = setInterval(fetchNode, 10000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})
</script>
