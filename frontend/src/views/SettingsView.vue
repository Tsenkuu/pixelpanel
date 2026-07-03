<template>
  <div class="space-y-6 animate-fade-in pb-10 max-w-5xl mx-auto">
    <div class="flex items-center justify-between border-b border-border pb-6">
      <div>
        <h2 class="text-2xl font-bold text-primary tracking-tight">Platform Settings</h2>
        <p class="text-sm text-secondary mt-1">Manage your account, preferences, and API access.</p>
      </div>
      <button class="btn-primary flex items-center shadow-lg shadow-accent/20">
        <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
        Save Changes
      </button>
    </div>

    <div class="flex flex-col md:flex-row gap-8">
      <!-- Settings Navigation -->
      <aside class="w-full md:w-64 shrink-0 space-y-1">
        <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id"
                class="w-full flex items-center px-3 py-2.5 rounded-lg text-sm transition-all duration-200"
                :class="activeTab === tab.id ? 'bg-surface border-l-2 border-accent text-primary font-medium' : 'text-secondary hover:text-primary hover:bg-surface-hover border-l-2 border-transparent'">
          <component :is="tab.icon" class="w-4 h-4 mr-3" :class="activeTab === tab.id ? 'text-accent' : 'text-secondary'" />
          {{ tab.name }}
        </button>
      </aside>

      <!-- Settings Content -->
      <main class="flex-1 space-y-8">
        
        <!-- Account Section -->
        <section v-if="activeTab === 'account'" class="space-y-6 animate-fade-in">
          <div class="glass-panel p-6">
            <h3 class="text-lg font-semibold text-primary mb-4 border-b border-border pb-3">Profile</h3>
            <div class="flex items-center space-x-6 mb-6">
              <div class="w-20 h-20 rounded-full bg-gradient-to-tr from-accent to-purple-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                A
              </div>
              <div>
                <button class="btn-secondary text-sm">Upload Avatar</button>
                <p class="text-xs text-secondary mt-2">JPG, GIF or PNG. 1MB max.</p>
              </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-secondary mb-1">Username</label>
                <input type="text" class="w-full bg-surface border border-border rounded-lg px-4 py-2 text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all" value="admin">
              </div>
              <div>
                <label class="block text-sm font-medium text-secondary mb-1">Email</label>
                <input type="email" class="w-full bg-surface border border-border rounded-lg px-4 py-2 text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all" value="admin@pixelpanel.io">
              </div>
            </div>
          </div>

          <div class="glass-panel p-6 border-error/50 bg-error/5">
            <h3 class="text-lg font-semibold text-error mb-2">Danger Zone</h3>
            <p class="text-sm text-secondary mb-4">Permanently delete your account and all associated applications.</p>
            <button class="bg-error hover:bg-error/80 text-white font-medium py-2 px-4 rounded-lg transition-colors">Delete Account</button>
          </div>
        </section>

        <!-- API Tokens Section -->
        <section v-if="activeTab === 'api'" class="space-y-6 animate-fade-in">
          <div class="glass-panel p-6">
            <div class="flex items-center justify-between border-b border-border pb-3 mb-6">
              <h3 class="text-lg font-semibold text-primary">Personal Access Tokens</h3>
              <button class="btn-primary text-sm flex items-center">
                <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                Generate Token
              </button>
            </div>
            
            <p class="text-sm text-secondary mb-6">Tokens allow you to interact with the PixelPanel API programmatically. Keep them secret.</p>
            
            <div class="space-y-3">
              <div class="flex items-center justify-between p-4 bg-surface rounded-lg border border-border group hover:border-secondary transition-colors">
                <div>
                  <h4 class="font-medium text-primary">GitHub Actions Deployer</h4>
                  <p class="text-xs text-secondary mt-1">Created 2 days ago • Never used</p>
                </div>
                <button class="text-secondary hover:text-error opacity-0 group-hover:opacity-100 transition-all">Revoke</button>
              </div>
              <div class="flex items-center justify-between p-4 bg-surface rounded-lg border border-border group hover:border-secondary transition-colors">
                <div>
                  <h4 class="font-medium text-primary">Local CLI Setup</h4>
                  <p class="text-xs text-secondary mt-1">Created last month • Last used yesterday</p>
                </div>
                <button class="text-secondary hover:text-error opacity-0 group-hover:opacity-100 transition-all">Revoke</button>
              </div>
            </div>
          </div>
        </section>
        
        <!-- Platform Section -->
        <section v-if="activeTab === 'platform'" class="space-y-6 animate-fade-in">
           <div class="glass-panel p-6">
            <h3 class="text-lg font-semibold text-primary mb-4 border-b border-border pb-3">Global Configuration</h3>
            
            <div class="space-y-6">
              <div>
                <label class="block text-sm font-medium text-secondary mb-1">Default Node.js Version</label>
                <select class="w-full bg-surface border border-border rounded-lg px-4 py-2 text-primary focus:border-accent outline-none transition-all">
                  <option>Node.js 20.x (LTS)</option>
                  <option>Node.js 18.x (LTS)</option>
                  <option>Node.js 21.x</option>
                </select>
              </div>
              
              <div class="flex items-center justify-between pt-4 border-t border-border">
                <div>
                  <h4 class="font-medium text-primary">Auto-Restart Applications</h4>
                  <p class="text-xs text-secondary">Automatically restart PM2 processes if they crash.</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked class="sr-only peer">
                  <div class="w-11 h-6 bg-surface-hover peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent border border-border"></div>
                </label>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, h } from 'vue'

const UserIcon = () => h('svg', { fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' })])
const KeyIcon = () => h('svg', { fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z' })])
const GlobeIcon = () => h('svg', { fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9' })])

const activeTab = ref('account')
const tabs = [
  { id: 'account', name: 'Account Profile', icon: UserIcon },
  { id: 'api', name: 'API Tokens', icon: KeyIcon },
  { id: 'platform', name: 'Platform Config', icon: GlobeIcon },
]
</script>
