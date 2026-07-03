<template>
  <div class="space-y-6 animate-fade-in">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-primary">Databases</h2>
        <p class="text-sm text-secondary mt-1">Native 1-Click Provisioning (No Docker)</p>
      </div>
      <button @click="showProvisionModal = true" class="btn-primary flex items-center spring-hover">
        <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        Provision Database
      </button>
    </div>

    <!-- Databases Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        v-for="db in databases" 
        :key="db.id"
        class="relative group spring-hover"
      >
        <!-- Mesh Gradient Border -->
        <div class="absolute -inset-[1px] bg-gradient-to-r from-[rgba(var(--mesh-1),0.4)] via-[rgba(var(--mesh-2),0.4)] to-[rgba(var(--mesh-3),0.4)] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

        <div class="relative glass-panel rounded-xl p-5 z-10 flex flex-col h-full">
          <!-- Header -->
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center">
              <!-- Engine Icon -->
              <div class="w-10 h-10 rounded-lg bg-surface flex items-center justify-center mr-3 border border-border/50">
                <span v-if="db.type === 'mariadb'" class="text-accent text-xl font-bold">M</span>
                <span v-else-if="db.type === 'postgres'" class="text-primary text-xl font-bold">P</span>
                <span v-else-if="db.type === 'redis'" class="text-error text-xl font-bold">R</span>
              </div>
              <div>
                <h3 class="text-base font-bold text-primary">{{ db.name }}</h3>
                <p class="text-xs text-secondary capitalize">{{ db.type }}</p>
              </div>
            </div>
            <div class="flex items-center space-x-1">
              <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full" :class="{
                'bg-success/20 text-success': db.status === 'active',
                'bg-warning/20 text-warning': db.status === 'provisioning',
                'bg-error/20 text-error': db.status === 'failed'
              }">{{ db.status }}</span>
            </div>
          </div>

          <!-- Connection Info -->
          <div v-if="db.status === 'active'" class="space-y-3 flex-grow">
            <div>
              <div class="text-[10px] uppercase tracking-wider text-secondary mb-1">Host / Port</div>
              <div class="text-sm font-mono text-primary bg-surface/50 px-2 py-1 rounded">{{ db.host }}:{{ db.port }}</div>
            </div>
            <div>
              <div class="text-[10px] uppercase tracking-wider text-secondary mb-1">Username</div>
              <div class="text-sm font-mono text-primary bg-surface/50 px-2 py-1 rounded">{{ db.username }}</div>
            </div>
            <div>
              <div class="text-[10px] uppercase tracking-wider text-secondary mb-1">Password</div>
              <div class="flex items-center">
                <input :type="visiblePasswords[db.id] ? 'text' : 'password'" :value="db.password" readonly class="text-sm font-mono text-primary bg-surface/50 px-2 py-1 rounded flex-grow outline-none border-none">
                <button @click="togglePassword(db.id)" class="ml-2 text-secondary hover:text-primary">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path v-if="!visiblePasswords[db.id]" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path v-if="!visiblePasswords[db.id]" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                </button>
                <button @click="copyToClipboard(db.password)" class="ml-2 text-secondary hover:text-primary" title="Copy">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                </button>
              </div>
            </div>
            <div class="mt-4 pt-4 border-t border-border/50">
              <div class="text-[10px] uppercase tracking-wider text-secondary mb-2">Linked Apps ({{ JSON.parse(db.linked_apps || '[]').length }})</div>
              <button @click="openLinkModal(db)" class="text-xs text-accent hover:text-accent-hover transition-colors flex items-center">
                <svg class="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                Link to App
              </button>
            </div>
          </div>
          
          <div v-else class="flex flex-col items-center justify-center flex-grow py-8 text-secondary">
             <div v-if="db.status === 'provisioning'" class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent mb-2"></div>
             <svg v-if="db.status === 'failed'" class="w-8 h-8 text-error mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
             <span class="text-xs capitalize">{{ db.status }}...</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="databases.length === 0" class="glass-panel rounded-2xl p-12 text-center mesh-gradient">
      <svg class="mx-auto h-16 w-16 text-secondary/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
      </svg>
      <h3 class="mt-4 text-lg font-semibold text-primary">No databases provisioned</h3>
      <p class="mt-2 text-sm text-secondary max-w-md mx-auto">
        Provision your first MariaDB, PostgreSQL, or Redis instance natively on your server.
      </p>
      <button @click="showProvisionModal = true" class="btn-primary mt-6 spring-hover">
        Provision Database
      </button>
    </div>

    <!-- Provision Modal -->
    <div v-if="showProvisionModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div class="glass-panel rounded-2xl p-6 w-full max-w-md shadow-2xl animate-scale-in">
        <h3 class="text-xl font-bold text-primary mb-4">Provision Database</h3>
        <form @submit.prevent="provisionDb" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-secondary mb-1">Database Name</label>
            <input v-model="newDb.name" type="text" required pattern="^[a-zA-Z0-9_]+$" title="Alphanumeric and underscores only" class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-primary focus:ring-2 focus:ring-accent outline-none transition-all" placeholder="my_app_db">
          </div>
          <div>
            <label class="block text-sm font-medium text-secondary mb-2">Engine</label>
            <div class="grid grid-cols-3 gap-3">
              <div 
                @click="newDb.type = 'mariadb'" 
                class="cursor-pointer border rounded-lg p-3 text-center transition-all"
                :class="newDb.type === 'mariadb' ? 'border-accent bg-accent/10' : 'border-border bg-surface hover:border-secondary'"
              >
                <div class="font-bold text-accent mb-1">MariaDB</div>
                <div class="text-[10px] text-secondary">Relational</div>
              </div>
              <div 
                @click="newDb.type = 'postgres'" 
                class="cursor-pointer border rounded-lg p-3 text-center transition-all"
                :class="newDb.type === 'postgres' ? 'border-primary bg-primary/10' : 'border-border bg-surface hover:border-secondary'"
              >
                <div class="font-bold text-primary mb-1">Postgres</div>
                <div class="text-[10px] text-secondary">Relational</div>
              </div>
              <div 
                @click="newDb.type = 'redis'" 
                class="cursor-pointer border rounded-lg p-3 text-center transition-all"
                :class="newDb.type === 'redis' ? 'border-error bg-error/10' : 'border-border bg-surface hover:border-secondary'"
              >
                <div class="font-bold text-error mb-1">Redis</div>
                <div class="text-[10px] text-secondary">Key-Value</div>
              </div>
            </div>
          </div>
          <div class="flex justify-end space-x-3 mt-6">
            <button type="button" @click="showProvisionModal = false" class="btn-secondary" :disabled="isProvisioning">Cancel</button>
            <button type="submit" class="btn-primary flex items-center" :disabled="isProvisioning">
              <span v-if="isProvisioning" class="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full"></span>
              {{ isProvisioning ? 'Provisioning...' : 'Provision' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Link App Modal -->
    <div v-if="showLinkModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div class="glass-panel rounded-2xl p-6 w-full max-w-md shadow-2xl animate-scale-in">
        <h3 class="text-xl font-bold text-primary mb-4">Link to App</h3>
        <p class="text-sm text-secondary mb-4">Select an app to inject the <code class="bg-surface px-1 py-0.5 rounded">DATABASE_URL</code> environment variable into.</p>
        
        <div class="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
          <div v-for="app in apps" :key="app.id" class="flex items-center justify-between p-3 rounded-lg border border-border bg-surface/50 hover:bg-surface transition-colors">
            <div>
               <div class="font-bold text-primary text-sm">{{ app.name }}</div>
               <div class="text-xs text-secondary">{{ app.tech_stack || 'Node.js' }}</div>
            </div>
            <button @click="linkToApp(app.id)" class="btn-secondary py-1 px-3 text-xs" :disabled="isLinking">
              Link
            </button>
          </div>
          <div v-if="apps.length === 0" class="text-center text-secondary py-4 text-sm">No apps available.</div>
        </div>

        <div class="flex justify-end mt-6">
          <button @click="showLinkModal = false" class="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const databases = ref([])
const apps = ref([])
const showProvisionModal = ref(false)
const showLinkModal = ref(false)
const isProvisioning = ref(false)
const isLinking = ref(false)
const selectedDbForLink = ref(null)

const newDb = ref({ name: '', type: 'mariadb' })
const visiblePasswords = ref({})

let pollInterval = null

const fetchDatabases = async () => {
  try {
    const res = await fetch('/api/databases', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('pixelpanel_token')}` }
    })
    if (res.ok) databases.value = await res.json()
  } catch (e) { console.error('Fetch databases error:', e) }
}

const fetchApps = async () => {
  try {
    const res = await fetch('/api/apps', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('pixelpanel_token')}` }
    })
    if (res.ok) apps.value = await res.json()
  } catch (e) { console.error('Fetch apps error:', e) }
}

const provisionDb = async () => {
  isProvisioning.value = true
  try {
    const res = await fetch('/api/databases/provision', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('pixelpanel_token')}`
      },
      body: JSON.stringify(newDb.value)
    })
    if (res.ok) {
      showProvisionModal.value = false
      newDb.value = { name: '', type: 'mariadb' }
      fetchDatabases()
    }
  } catch (e) { 
    console.error('Provisioning error:', e) 
  } finally {
    isProvisioning.value = false
  }
}

const openLinkModal = (db) => {
  selectedDbForLink.value = db
  fetchApps()
  showLinkModal.value = true
}

const linkToApp = async (appId) => {
  if (!selectedDbForLink.value) return
  isLinking.value = true
  try {
    const res = await fetch(`/api/databases/${selectedDbForLink.value.id}/link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('pixelpanel_token')}`
      },
      body: JSON.stringify({ appId })
    })
    if (res.ok) {
      showLinkModal.value = false
      fetchDatabases()
    }
  } catch (e) {
    console.error('Link error:', e)
  } finally {
    isLinking.value = false
  }
}

const togglePassword = (id) => {
  visiblePasswords.value[id] = !visiblePasswords.value[id]
}

const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text)
}

onMounted(() => {
  fetchDatabases()
  pollInterval = setInterval(fetchDatabases, 5000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})
</script>
