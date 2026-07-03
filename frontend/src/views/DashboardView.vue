<template>
  <div class="space-y-6 animate-fade-in pb-10">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-primary tracking-tight">Overview</h2>
        <p class="text-sm text-secondary mt-1">Real-time telemetry and resource usage.</p>
      </div>
      <div class="flex items-center space-x-2 text-sm bg-surface px-3 py-1.5 rounded-full border border-border">
        <span class="relative flex h-2.5 w-2.5">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" v-if="isConnected"></span>
          <span class="relative inline-flex rounded-full h-2.5 w-2.5" :class="isConnected ? 'bg-success' : 'bg-error'"></span>
        </span>
        <span class="text-primary font-medium">{{ isConnected ? 'Connected' : 'Reconnecting...' }}</span>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
      <div class="glass-panel p-5 glass-panel-hover group relative overflow-hidden">
        <div class="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
          <svg class="w-8 h-8 text-accent/20 group-hover:text-accent/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/></svg>
        </div>
        <h3 class="text-secondary text-sm font-medium mb-2 relative z-10">CPU Usage</h3>
        <div class="flex items-end justify-between relative z-10">
          <div>
            <div class="text-3xl font-bold text-primary">{{ stats.cpu?.load || '0.00' }}<span class="text-lg text-secondary ml-1">%</span></div>
            <div class="text-xs text-secondary mt-1">{{ stats.cpu?.cores || 0 }} Cores @ {{ stats.cpu?.speed || 0 }}GHz</div>
          </div>
        </div>
      </div>
      
      <div class="glass-panel p-5 glass-panel-hover group relative overflow-hidden">
        <div class="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
          <svg class="w-8 h-8 text-purple-500/20 group-hover:text-purple-500/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
        </div>
        <h3 class="text-secondary text-sm font-medium mb-2 relative z-10">RAM Usage</h3>
        <div class="flex items-end justify-between relative z-10">
          <div>
            <div class="text-3xl font-bold text-primary">{{ stats.memory?.usagePercent || '0.00' }}<span class="text-lg text-secondary ml-1">%</span></div>
            <div class="text-xs text-secondary mt-1">{{ formatBytes(stats.memory?.used || 0) }} / {{ formatBytes(stats.memory?.total || 0) }}</div>
          </div>
        </div>
      </div>

      <div class="glass-panel p-5 glass-panel-hover group relative overflow-hidden">
        <div class="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
          <svg class="w-8 h-8 text-emerald-500/20 group-hover:text-emerald-500/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
        <h3 class="text-secondary text-sm font-medium mb-2 relative z-10">Server Uptime</h3>
        <div class="flex items-end justify-between relative z-10">
          <div>
            <div class="text-3xl font-bold text-primary">{{ formatUptime(stats.os?.uptime || 0) }}</div>
            <div class="text-xs text-secondary mt-1">{{ stats.os?.distro || 'Loading...' }}</div>
          </div>
        </div>
      </div>

      <div class="glass-panel p-5 glass-panel-hover group relative overflow-hidden">
        <div class="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
          <svg class="w-8 h-8 text-amber-500/20 group-hover:text-amber-500/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
        </div>
        <h3 class="text-secondary text-sm font-medium mb-2 relative z-10">Network Traffic</h3>
        <div class="flex items-end justify-between relative z-10">
          <div class="w-full">
            <div class="flex justify-between items-baseline mb-1">
              <span class="text-xs text-secondary">RX</span>
              <span class="text-lg font-bold text-primary">{{ formatBytes(stats.network?.[0]?.rx_sec || 0) }}/s</span>
            </div>
            <div class="w-full bg-surface-hover rounded-full h-1.5 mb-2 overflow-hidden">
              <div class="bg-emerald-500 h-1.5 rounded-full" :style="{ width: Math.min(((stats.network?.[0]?.rx_sec || 0)/1000000)*100, 100) + '%' }"></div>
            </div>
            <div class="flex justify-between items-baseline mb-1">
              <span class="text-xs text-secondary">TX</span>
              <span class="text-lg font-bold text-primary">{{ formatBytes(stats.network?.[0]?.tx_sec || 0) }}/s</span>
            </div>
            <div class="w-full bg-surface-hover rounded-full h-1.5 overflow-hidden">
              <div class="bg-amber-500 h-1.5 rounded-full" :style="{ width: Math.min(((stats.network?.[0]?.tx_sec || 0)/1000000)*100, 100) + '%' }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Charts Section -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mt-6">
      <div class="glass-panel p-5">
        <h3 class="text-primary font-semibold mb-4">CPU Utilization (Last 60s)</h3>
        <div class="h-64 relative">
          <canvas ref="cpuChartRef"></canvas>
        </div>
      </div>
      <div class="glass-panel p-5">
        <h3 class="text-primary font-semibold mb-4">Memory Allocation (Last 60s)</h3>
        <div class="h-64 relative">
          <canvas ref="ramChartRef"></canvas>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, shallowRef } from 'vue'
import { io } from 'socket.io-client'
import Chart from 'chart.js/auto'

const stats = ref({})
const isConnected = ref(false)
let socket = null

const cpuChartRef = ref(null)
const ramChartRef = ref(null)

const cpuChart = shallowRef(null)
const ramChart = shallowRef(null)

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 0 },
  elements: { point: { radius: 0, hitRadius: 10, hoverRadius: 4 } },
  scales: {
    x: { display: false },
    y: { min: 0, max: 100, grid: { color: '#333333', drawBorder: false }, ticks: { color: '#888888', stepSize: 25 } }
  },
  plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } }
}

const initCharts = () => {
  if (cpuChartRef.value) {
    cpuChart.value = new Chart(cpuChartRef.value, {
      type: 'line',
      data: { labels: [], datasets: [{ label: 'CPU %', data: [], borderColor: '#0070f3', backgroundColor: 'rgba(0, 112, 243, 0.1)', borderWidth: 2, fill: true, tension: 0.4 }] },
      options: chartOptions
    })
  }
  if (ramChartRef.value) {
    ramChart.value = new Chart(ramChartRef.value, {
      type: 'line',
      data: { labels: [], datasets: [{ label: 'RAM %', data: [], borderColor: '#a855f7', backgroundColor: 'rgba(168, 85, 247, 0.1)', borderWidth: 2, fill: true, tension: 0.4 }] },
      options: chartOptions
    })
  }
}

const updateCharts = (history) => {
  if (!history || !history.labels) return

  if (cpuChart.value) {
    cpuChart.value.data.labels = history.labels
    cpuChart.value.data.datasets[0].data = history.cpu
    cpuChart.value.update('none')
  }
  
  if (ramChart.value) {
    ramChart.value.data.labels = history.labels
    ramChart.value.data.datasets[0].data = history.ram
    ramChart.value.update('none')
  }
}

onMounted(() => {
  initCharts()

  socket = io('http://localhost:3000')

  socket.on('connect', () => {
    isConnected.value = true
  })

  socket.on('disconnect', () => {
    isConnected.value = false
  })

  socket.on('system:stats', (data) => {
    stats.value = data
    if (data.history) {
      updateCharts(data.history)
    }
  })
})

onUnmounted(() => {
  if (socket) socket.disconnect()
  if (cpuChart.value) cpuChart.value.destroy()
  if (ramChart.value) ramChart.value.destroy()
})

const formatBytes = (bytes, decimals = 1) => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

const formatUptime = (seconds) => {
  const d = Math.floor(seconds / (3600 * 24))
  const h = Math.floor(seconds % (3600 * 24) / 3600)
  const m = Math.floor(seconds % 3600 / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}
</script>
