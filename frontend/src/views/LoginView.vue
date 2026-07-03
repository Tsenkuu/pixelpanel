<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-10">
        <h1 class="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">PixelPanel</h1>
        <p class="mt-2 text-slate-400">Sign in to your deployment platform</p>
      </div>
      
      <div class="bg-panel-card p-8 rounded-2xl shadow-xl border border-slate-700/50 backdrop-blur-xl">
        <form @submit.prevent="handleLogin" class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">Username</label>
            <input type="text" v-model="username" required 
                   class="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                   placeholder="admin" />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">Password</label>
            <input type="password" v-model="password" required 
                   class="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                   placeholder="••••••••" />
          </div>
          
          <button type="submit" :disabled="isLoading"
                  class="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-panel-card flex justify-center items-center">
            <span v-if="!isLoading">Sign In</span>
            <svg v-else class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const username = ref('')
const password = ref('')
const isLoading = ref(false)

const handleLogin = async () => {
  isLoading.value = true
  // Simulate API call
  setTimeout(() => {
    localStorage.setItem('pixelpanel_token', 'fake_jwt_token_for_now')
    router.push('/')
    isLoading.value = false
  }, 1000)
}
</script>
