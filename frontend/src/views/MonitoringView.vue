<template>
  <div class="space-y-6 animate-fade-in pb-10">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-primary mb-2">Global Monitoring</h1>
        <p class="text-secondary text-sm">Enterprise-grade analytics & metrics visualization.</p>
      </div>

      <div class="flex space-x-4">
        <!-- Timeframe Selector -->
        <div class="flex bg-surface border border-border p-1 rounded-xl">
          <button v-for="t in timeframes" :key="t.value" 
            @click="setTimeframe(t.value)"
            class="px-4 py-1.5 text-sm font-medium rounded-lg transition-all"
            :class="currentTimeframe === t.value ? 'bg-accent text-white shadow-sm' : 'text-secondary hover:text-primary hover:bg-background'"
          >
            {{ t.label }}
          </button>
        </div>

        <!-- Export Dropdown -->
        <div class="relative">
          <button @click="showExportMenu = !showExportMenu" class="btn-secondary flex items-center">
            <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export
          </button>
          
          <transition name="fade">
            <div v-if="showExportMenu" class="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-xl shadow-xl overflow-hidden z-50">
              <button @click="exportData('csv')" class="w-full text-left px-4 py-3 text-sm text-secondary hover:bg-background hover:text-primary transition-colors border-b border-border">Export as CSV</button>
              <button @click="exportData('json')" class="w-full text-left px-4 py-3 text-sm text-secondary hover:bg-background hover:text-primary transition-colors border-b border-border">Export as JSON</button>
              <button @click="exportPNG" class="w-full text-left px-4 py-3 text-sm text-secondary hover:bg-background hover:text-primary transition-colors">Export as PNG</button>
            </div>
          </transition>
        </div>
      </div>
    </div>

    <!-- Live Status Indicators (only visible on realtime) -->
    <div v-if="currentTimeframe === 'realtime'" class="grid grid-cols-2 lg:grid-cols-4 gap-6">
      <div class="glass-panel p-6 relative overflow-hidden group">
        <div class="absolute right-0 top-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all"></div>
        <div class="text-sm font-medium text-secondary mb-1">CPU Load</div>
        <div class="text-3xl font-bold text-primary">{{ currentCpu.toFixed(1) }}%</div>
      </div>
      <div class="glass-panel p-6 relative overflow-hidden group">
        <div class="absolute right-0 top-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all"></div>
        <div class="text-sm font-medium text-secondary mb-1">RAM Usage</div>
        <div class="text-3xl font-bold text-primary">{{ currentRam.toFixed(1) }}%</div>
      </div>
      <div class="glass-panel p-6 relative overflow-hidden group">
        <div class="absolute right-0 top-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all"></div>
        <div class="text-sm font-medium text-secondary mb-1">System Temp</div>
        <div class="text-3xl font-bold text-primary">{{ currentTemp }}°C</div>
      </div>
      <div class="glass-panel p-6 relative overflow-hidden group">
        <div class="absolute right-0 top-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl group-hover:bg-orange-500/20 transition-all"></div>
        <div class="text-sm font-medium text-secondary mb-1">Network (RX/TX)</div>
        <div class="text-xl font-bold text-primary truncate">{{ formatBytes(currentRx) }} / {{ formatBytes(currentTx) }}</div>
      </div>
    </div>

    <!-- Charts Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6" ref="chartsContainer">
      <div class="glass-panel p-6 h-[400px]">
        <h3 class="text-sm font-bold text-secondary mb-4 uppercase tracking-wider">CPU & Memory Utilization</h3>
        <div class="h-[300px]">
          <Line v-if="chartData1" :data="chartData1" :options="chartOptions" />
        </div>
      </div>
      
      <div class="glass-panel p-6 h-[400px]">
        <h3 class="text-sm font-bold text-secondary mb-4 uppercase tracking-wider">Network Throughput (RX/TX)</h3>
        <div class="h-[300px]">
          <Line v-if="chartData2" :data="chartData2" :options="chartOptionsArea" />
        </div>
      </div>

      <div class="glass-panel p-6 h-[400px]">
        <h3 class="text-sm font-bold text-secondary mb-4 uppercase tracking-wider">Storage & Swap</h3>
        <div class="h-[300px]">
          <Line v-if="chartData3" :data="chartData3" :options="chartOptionsArea" />
        </div>
      </div>

      <div class="glass-panel p-6 h-[400px]">
        <h3 class="text-sm font-bold text-secondary mb-4 uppercase tracking-wider">Thermal (Temp)</h3>
        <div class="h-[300px]">
          <Line v-if="chartData4" :data="chartData4" :options="chartOptions" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { io } from 'socket.io-client'
import html2canvas from 'html2canvas'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line } from 'vue-chartjs'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const timeframes = [
  { label: 'Realtime', value: 'realtime' },
  { label: '1 Hour', value: '1h' },
  { label: '24 Hours', value: '24h' },
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' }
]

const currentTimeframe = ref('realtime')
const showExportMenu = ref(false)
const chartsContainer = ref(null)

let socket = null

// Live Data
const currentCpu = ref(0)
const currentRam = ref(0)
const currentTemp = ref(0)
const currentRx = ref(0)
const currentTx = ref(0)

// Chart State
const labels = ref([])
const dataCpu = ref([])
const dataRam = ref([])
const dataRx = ref([])
const dataTx = ref([])
const dataSwap = ref([])
const dataDisk = ref([])
const dataTemp = ref([])

const MAX_REALTIME_POINTS = 30 // ~5 mins at 10s tick

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Chart Options Configs
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { labels: { color: '#a1a1aa' } }
  },
  scales: {
    x: { grid: { color: '#27272a' }, ticks: { color: '#71717a', maxTicksLimit: 10 } },
    y: { grid: { color: '#27272a' }, ticks: { color: '#71717a' }, min: 0 }
  },
  animation: { duration: 0 } // Disable animation for realtime to prevent stuttering
}

const chartOptionsArea = {
  ...chartOptions,
  plugins: { ...chartOptions.plugins, filler: { propagate: true } }
}

// Chart Data Computed Properties
const chartData1 = computed(() => ({
  labels: labels.value,
  datasets: [
    { label: 'CPU (%)', borderColor: '#3b82f6', backgroundColor: 'transparent', data: dataCpu.value, tension: 0.4 },
    { label: 'RAM (%)', borderColor: '#a855f7', backgroundColor: 'transparent', data: dataRam.value, tension: 0.4 }
  ]
}))

const chartData2 = computed(() => ({
  labels: labels.value,
  datasets: [
    { label: 'RX (Bytes)', borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, data: dataRx.value, tension: 0.4 },
    { label: 'TX (Bytes)', borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)', fill: true, data: dataTx.value, tension: 0.4 }
  ]
}))

const chartData3 = computed(() => ({
  labels: labels.value,
  datasets: [
    { label: 'Disk Used (%)', borderColor: '#ec4899', backgroundColor: 'transparent', data: dataDisk.value, tension: 0.4 },
    { label: 'Swap Used (%)', borderColor: '#6366f1', backgroundColor: 'rgba(99, 102, 241, 0.1)', fill: true, data: dataSwap.value, tension: 0.4 }
  ]
}))

const chartData4 = computed(() => ({
  labels: labels.value,
  datasets: [
    { label: 'Temp (°C)', borderColor: '#ef4444', backgroundColor: 'transparent', data: dataTemp.value, tension: 0.4 }
  ]
}))


onMounted(() => {
  setupSocket()
})

onUnmounted(() => {
  if (socket) socket.disconnect()
})

const setupSocket = () => {
  socket = io('/')
  
  socket.on('system:stats', (stats) => {
    if (currentTimeframe.value !== 'realtime') return // Ignore real-time ticks if viewing history

    const timeStr = new Date().toLocaleTimeString()
    const cpu = stats.cpu.currentLoad
    const ram = (stats.memory.active / stats.memory.total) * 100
    const swap = stats.memory.swaptotal > 0 ? (stats.memory.swapused / stats.memory.swaptotal) * 100 : 0
    const disk = stats.fsSize[0] ? stats.fsSize[0].use : 0
    const temp = stats.cpuTemperature.main || 0
    const rx = stats.networkStats[0] ? stats.networkStats[0].rx_bytes : 0
    const tx = stats.networkStats[0] ? stats.networkStats[0].tx_bytes : 0

    // Update Live Indicators
    currentCpu.value = cpu
    currentRam.value = ram
    currentTemp.value = temp
    currentRx.value = rx
    currentTx.value = tx

    // Update Arrays
    labels.value.push(timeStr)
    dataCpu.value.push(cpu)
    dataRam.value.push(ram)
    dataSwap.value.push(swap)
    dataDisk.value.push(disk)
    dataTemp.value.push(temp)
    dataRx.value.push(rx)
    dataTx.value.push(tx)

    // Keep array size bounded
    if (labels.value.length > MAX_REALTIME_POINTS) {
      labels.value.shift()
      dataCpu.value.shift()
      dataRam.value.shift()
      dataSwap.value.shift()
      dataDisk.value.shift()
      dataTemp.value.shift()
      dataRx.value.shift()
      dataTx.value.shift()
    }
  })
}

const setTimeframe = async (tf) => {
  currentTimeframe.value = tf
  
  // Reset arrays
  labels.value = []
  dataCpu.value = []
  dataRam.value = []
  dataSwap.value = []
  dataDisk.value = []
  dataTemp.value = []
  dataRx.value = []
  dataTx.value = []

  if (tf === 'realtime') {
    // Wait for next socket tick
    return
  }

  // Fetch History
  try {
    const res = await fetch(`/api/metrics/history?range=${tf}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('pixelpanel_token')}` }
    })
    const data = await res.json()

    data.forEach(row => {
      // Parse timestamp beautifully
      const d = new Date(row.timestamp)
      const tStr = tf === '1h' || tf === '24h' 
        ? d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        : d.toLocaleDateString([], {month: 'short', day: 'numeric', hour: '2-digit'})
      
      labels.value.push(tStr)
      dataCpu.value.push(row.cpu_load)
      dataRam.value.push(row.ram_total > 0 ? (row.ram_used / row.ram_total) * 100 : 0)
      dataSwap.value.push(row.swap_total > 0 ? (row.swap_used / row.swap_total) * 100 : 0)
      dataDisk.value.push(row.disk_total > 0 ? (row.disk_used / row.disk_total) * 100 : 0)
      dataTemp.value.push(row.temp_main)
      dataRx.value.push(row.net_rx)
      dataTx.value.push(row.net_tx)
    })
  } catch (e) {
    console.error('Failed to load history', e)
  }
}

const exportData = (format) => {
  // Use the history endpoint to trigger a download
  const tf = currentTimeframe.value === 'realtime' ? '1h' : currentTimeframe.value
  window.location.href = `/api/metrics/export?format=${format}&range=${tf}&token=${localStorage.getItem('pixelpanel_token')}`
  showExportMenu.value = false
}

const exportPNG = async () => {
  showExportMenu.value = false
  if (!chartsContainer.value) return
  
  try {
    const canvas = await html2canvas(chartsContainer.value, { backgroundColor: '#0f0f0f' })
    const link = document.createElement('a')
    link.download = `pixelpanel-monitoring-${currentTimeframe.value}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  } catch (e) {
    console.error('Export PNG failed', e)
  }
}
</script>
