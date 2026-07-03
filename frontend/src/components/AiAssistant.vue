<template>
  <div>
    <!-- Floating Action Button to toggle AI Assistant -->
    <button @click="isOpen = true" class="fixed bottom-6 right-6 p-4 bg-gradient-to-tr from-accent to-purple-500 rounded-full text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all z-40 group">
      <svg class="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
      <!-- Tooltip -->
      <span class="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-surface border border-border text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Ask AI Assistant</span>
    </button>

    <!-- Slide-out Panel -->
    <transition name="slide-left">
      <div v-if="isOpen" class="fixed inset-y-0 right-0 w-full sm:w-96 md:w-[28rem] bg-surface/95 backdrop-blur-xl border-l border-border shadow-2xl z-50 flex flex-col">
        <!-- Header -->
        <div class="p-4 border-b border-border flex items-center justify-between bg-background/50">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-accent to-purple-500 flex items-center justify-center">
              <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
            </div>
            <div>
              <h3 class="font-bold text-primary text-sm">Pixel AI</h3>
              <p class="text-[10px] text-success flex items-center"><span class="w-1.5 h-1.5 bg-success rounded-full mr-1 animate-pulse"></span> Context Engine Online</p>
            </div>
          </div>
          <button @click="isOpen = false" class="text-secondary hover:text-primary transition-colors p-1">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <!-- Chat Area -->
        <div class="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth" ref="chatContainer">
          
          <!-- Welcome Message -->
          <div v-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-center space-y-6 animate-fade-in">
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-accent to-purple-500 flex items-center justify-center shadow-lg shadow-accent/20">
              <svg class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div>
              <h2 class="text-xl font-bold text-primary">How can I help?</h2>
              <p class="text-sm text-secondary mt-2 max-w-[250px] mx-auto">I can analyze your server logs, PM2 processes, and configurations automatically.</p>
            </div>
            
            <!-- Quick Prompts -->
            <div class="flex flex-col w-full space-y-2 mt-8">
              <button @click="ask('Why is my RAM usage so high?')" class="text-left px-4 py-3 rounded-xl bg-background border border-border hover:border-accent hover:bg-accent/5 transition-all text-sm text-primary">
                "Why is my RAM usage so high?"
              </button>
              <button @click="ask('Analyze my Nginx configuration.')" class="text-left px-4 py-3 rounded-xl bg-background border border-border hover:border-accent hover:bg-accent/5 transition-all text-sm text-primary">
                "Analyze my Nginx configuration."
              </button>
              <button @click="ask('Why did my application crash?')" class="text-left px-4 py-3 rounded-xl bg-background border border-border hover:border-accent hover:bg-accent/5 transition-all text-sm text-primary">
                "Why did my application crash?"
              </button>
            </div>
          </div>

          <!-- Messages -->
          <div v-for="(msg, index) in messages" :key="index" class="flex flex-col" :class="msg.role === 'user' ? 'items-end' : 'items-start'">
            <div class="max-w-[85%] rounded-2xl px-4 py-3" :class="msg.role === 'user' ? 'bg-accent text-white rounded-br-none' : 'bg-background border border-border text-primary rounded-bl-none'">
              <!-- Render Markdown for AI, normal text for user -->
              <div v-if="msg.role === 'ai'" class="markdown-body text-sm" v-html="renderMarkdown(msg.content)"></div>
              <div v-else class="text-sm whitespace-pre-wrap">{{ msg.content }}</div>
            </div>
          </div>

          <!-- Typing Indicator -->
          <div v-if="isTyping" class="flex items-start">
            <div class="bg-background border border-border rounded-2xl rounded-bl-none px-4 py-4 flex space-x-1">
              <div class="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" style="animation-delay: 0ms"></div>
              <div class="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" style="animation-delay: 150ms"></div>
              <div class="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" style="animation-delay: 300ms"></div>
            </div>
          </div>
        </div>

        <!-- Input Area -->
        <div class="p-4 bg-background/50 border-t border-border">
          <form @submit.prevent="submitForm" class="relative">
            <input 
              v-model="inputMessage" 
              type="text" 
              placeholder="Ask anything about your server..." 
              class="w-full bg-surface border border-border rounded-full pl-4 pr-12 py-3 text-sm text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all shadow-inner"
              :disabled="isTyping"
            >
            <button type="submit" :disabled="!inputMessage.trim() || isTyping" class="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-accent text-white rounded-full hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </form>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify' // In a real env, import this to sanitize HTML

const isOpen = ref(false)
const messages = ref([])
const inputMessage = ref('')
const isTyping = ref(false)
const chatContainer = ref(null)

const scrollToBottom = async () => {
  await nextTick()
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}

const renderMarkdown = (text) => {
  // In a real app, wrap marked(text) with DOMPurify.sanitize() to prevent XSS.
  // We use simple marked configuration for code highlighting support.
  return marked(text, { breaks: true })
}

const ask = (question) => {
  inputMessage.value = question
  submitForm()
}

const submitForm = async () => {
  const msg = inputMessage.value.trim()
  if (!msg || isTyping.value) return

  messages.value.push({ role: 'user', content: msg })
  inputMessage.value = ''
  isTyping.value = true
  scrollToBottom()

  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('pixelpanel_token')}`
      },
      body: JSON.stringify({ message: msg })
    })

    if (!res.ok) throw new Error('API Error')

    // Create a new AI message placeholder
    const aiMessageIndex = messages.value.length
    messages.value.push({ role: 'ai', content: '' })
    isTyping.value = false

    // Handle SSE Stream
    const reader = res.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter(line => line.trim().startsWith('data: '))
      
      for (const line of lines) {
        const data = line.replace('data: ', '')
        if (data === '[DONE]') break
        
        try {
          const parsed = JSON.parse(data)
          if (parsed.token) {
            messages.value[aiMessageIndex].content += parsed.token
            scrollToBottom()
          } else if (parsed.error) {
            messages.value[aiMessageIndex].content += `\n**Error:** ${parsed.error}`
          }
        } catch (e) {
          // Ignore JSON parse errors for split chunks
        }
      }
    }
  } catch (error) {
    console.error('Chat error:', error)
    messages.value.push({ role: 'ai', content: '**Error connecting to Context Engine.** Please ensure the AI backend is reachable.' })
    isTyping.value = false
    scrollToBottom()
  }
}
</script>

<style>
/* Transitions */
.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-left-enter-from,
.slide-left-leave-to {
  transform: translateX(100%);
}

/* Markdown Styles inside Chat */
.markdown-body {
  @apply text-primary;
}
.markdown-body p {
  @apply mb-2 last:mb-0;
}
.markdown-body pre {
  @apply bg-[#1a1a1a] p-3 rounded-lg overflow-x-auto my-2 border border-border;
}
.markdown-body code {
  @apply bg-[#1a1a1a] px-1.5 py-0.5 rounded text-accent font-mono text-xs border border-border;
}
.markdown-body pre code {
  @apply bg-transparent p-0 text-primary border-none text-xs;
}
.markdown-body ul {
  @apply list-disc list-inside mb-2;
}
.markdown-body ol {
  @apply list-decimal list-inside mb-2;
}
</style>
