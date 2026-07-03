<template>
  <div class="ide-container">
    <!-- Activity Bar (Leftmost) -->
    <div class="activity-bar">
      <div class="activity-icon" :class="{ active: activeView === 'explorer' }" @click="activeView = 'explorer'">
        <i class="fas fa-file-code"></i>
      </div>
      <div class="activity-icon" :class="{ active: activeView === 'search' }" @click="activeView = 'search'">
        <i class="fas fa-search"></i>
      </div>
      <div class="activity-icon" :class="{ active: activeView === 'git' }" @click="activeView = 'git'">
        <i class="fas fa-code-branch"></i>
      </div>
    </div>

    <!-- Sidebar -->
    <div class="sidebar">
      <div class="sidebar-header">
        <h2 v-if="activeView === 'explorer'">EXPLORER</h2>
        <h2 v-if="activeView === 'search'">SEARCH</h2>
        <h2 v-if="activeView === 'git'">SOURCE CONTROL</h2>
      </div>
      <div class="sidebar-content">
        <!-- Explorer View -->
        <div v-show="activeView === 'explorer'" class="explorer-view">
          <FileTree 
            :files="files" 
            :appId="appId"
            @file-selected="openFile" 
          />
        </div>
        <!-- Search View -->
        <div v-show="activeView === 'search'" class="search-view">
          <input type="text" v-model="searchQuery" @keyup.enter="performSearch" placeholder="Search..." class="search-input" />
          <div v-for="result in searchResults" :key="result.file + result.line" class="search-result" @click="openFile(result.file, result.line)">
            <div class="search-file">{{ result.file }}</div>
            <div class="search-snippet"><span class="search-line">{{ result.line }}:</span> {{ result.content }}</div>
          </div>
        </div>
        <!-- Git View -->
        <div v-show="activeView === 'git'" class="git-view">
          <div class="git-actions">
            <button @click="refreshGit" class="btn btn-sm btn-outline"><i class="fas fa-sync"></i> Refresh</button>
          </div>
          <div v-if="gitStatus" class="git-status-list">
             <div v-for="file in gitStatus.modified" :key="file" class="git-file modified" @click="viewDiff(file)">
               <i class="fas fa-circle"></i> {{ file }}
             </div>
             <div v-for="file in gitStatus.not_added" :key="file" class="git-file untracked" @click="openFile(file)">
               <i class="fas fa-plus"></i> {{ file }}
             </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Editor Area -->
    <div class="main-area">
      <div class="editor-tabs">
        <div 
          v-for="tab in openTabs" 
          :key="tab.path" 
          class="tab" 
          :class="{ active: currentTab && currentTab.path === tab.path }"
          @click="selectTab(tab)"
        >
          <span class="tab-name">{{ tab.name }}</span>
          <span class="tab-close" @click.stop="closeTab(tab)">&times;</span>
        </div>
      </div>
      
      <div class="editor-container" ref="editorContainer">
        <!-- Monaco Editor injected here -->
      </div>
    </div>

    <!-- Terminal Panel -->
    <div class="terminal-panel" :class="{ 'is-open': terminalOpen }">
      <div class="terminal-header" @click="terminalOpen = !terminalOpen">
        <h3>TERMINAL</h3>
        <i class="fas" :class="terminalOpen ? 'fa-chevron-down' : 'fa-chevron-up'"></i>
      </div>
      <div class="terminal-container" ref="terminalContainer" v-show="terminalOpen">
        <!-- Xterm.js injected here -->
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, shallowRef } from 'vue'
import { useRoute } from 'vue-router'
import api from '../api' // Assuming a custom axios instance exists
import FileTree from '../components/FileTree.vue'

// Since Monaco and xterm might be loaded dynamically, we handle them carefully
import * as monaco from 'monaco-editor'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'
import { io } from 'socket.io-client'

const route = useRoute()
const appId = route.params.id

const activeView = ref('explorer')
const terminalOpen = ref(true)
const files = ref([])
const openTabs = ref([])
const currentTab = ref(null)

const editorContainer = ref(null)
const terminalContainer = ref(null)

const monacoInstance = shallowRef(null)
const xtermInstance = shallowRef(null)
const fitAddon = shallowRef(null)

// Search State
const searchQuery = ref('')
const searchResults = ref([])

// Git State
const gitStatus = ref(null)

onMounted(async () => {
  await fetchFiles('/')
  initEditor()
  initTerminal()
})

onUnmounted(() => {
  if (monacoInstance.value) monacoInstance.value.dispose()
  if (xtermInstance.value) xtermInstance.value.dispose()
})

const fetchFiles = async (path = '/') => {
  try {
    const res = await api.get(`/api/files/${appId}/list?path=${encodeURIComponent(path)}`)
    files.value = res.data
  } catch (e) {
    console.error('Failed to fetch files', e)
  }
}

const openFile = async (filePath, line = null) => {
  try {
    const existingTab = openTabs.value.find(t => t.path === filePath)
    if (existingTab) {
      selectTab(existingTab)
    } else {
      const res = await api.get(`/api/files/${appId}/read?path=${encodeURIComponent(filePath)}`)
      const newTab = {
        name: filePath.split('/').pop(),
        path: filePath,
        content: res.data
      }
      openTabs.value.push(newTab)
      selectTab(newTab)
    }
    
    if (line && monacoInstance.value) {
      setTimeout(() => {
        monacoInstance.value.revealLineInCenter(line)
        monacoInstance.value.setPosition({ lineNumber: line, column: 1 })
      }, 100)
    }
  } catch (e) {
    console.error('Failed to open file', e)
  }
}

const selectTab = (tab) => {
  currentTab.value = tab
  if (monacoInstance.value) {
    monacoInstance.value.setValue(tab.content)
    // Add logic to determine language based on extension
    const ext = tab.name.split('.').pop()
    const langMap = {
      'js': 'javascript', 'json': 'json', 'vue': 'html', 'html': 'html', 'css': 'css', 'md': 'markdown'
    }
    monaco.editor.setModelLanguage(monacoInstance.value.getModel(), langMap[ext] || 'plaintext')
  }
}

const closeTab = (tab) => {
  openTabs.value = openTabs.value.filter(t => t.path !== tab.path)
  if (currentTab.value && currentTab.value.path === tab.path) {
    if (openTabs.value.length > 0) {
      selectTab(openTabs.value[0])
    } else {
      currentTab.value = null
      if (monacoInstance.value) monacoInstance.value.setValue('')
    }
  }
}

const initEditor = () => {
  if (!editorContainer.value) return
  monacoInstance.value = monaco.editor.create(editorContainer.value, {
    value: '',
    language: 'javascript',
    theme: 'vs-dark',
    automaticLayout: true
  })
  
  // Autosave simulation
  monacoInstance.value.onDidChangeModelContent(() => {
    if (currentTab.value) {
      currentTab.value.content = monacoInstance.value.getValue()
      // Call save debounced
      saveFileDebounced(currentTab.value.path, currentTab.value.content)
    }
  })
}

let saveTimeout = null
const saveFileDebounced = (path, content) => {
  clearTimeout(saveTimeout)
  saveTimeout = setTimeout(async () => {
    try {
      await api.post(`/api/files/${appId}/write`, { path, content })
      console.log('Saved', path)
    } catch (e) {
      console.error('Failed to save', e)
    }
  }, 1000)
}

const initTerminal = () => {
  if (!terminalContainer.value) return
  xtermInstance.value = new Terminal({
    theme: { background: '#1e1e1e' },
    cursorBlink: true
  })
  fitAddon.value = new FitAddon()
  xtermInstance.value.loadAddon(fitAddon.value)
  xtermInstance.value.open(terminalContainer.value)
  
  // Fit on next tick
  nextTick(() => {
    fitAddon.value.fit()
  })

  // Connect WebSocket to backend terminal
  const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000')
  
  socket.on('connect', () => {
    socket.emit('terminal:start', appId)
  })

  socket.on('terminal:data', (data) => {
    xtermInstance.value.write(data)
  })

  xtermInstance.value.onData((data) => {
    socket.emit('terminal:input', data)
  })

  xtermInstance.value.onResize((size) => {
    socket.emit('terminal:resize', size)
  })
}

const performSearch = async () => {
  if (!searchQuery.value) return
  try {
    const res = await api.post(`/api/files/${appId}/search`, { query: searchQuery.value })
    searchResults.value = res.data
  } catch (e) {
    console.error('Search failed', e)
  }
}

const refreshGit = async () => {
  try {
    const res = await api.get(`/api/files/${appId}/git/status`)
    gitStatus.value = res.data
  } catch (e) {
    console.error('Git status failed', e)
  }
}

const viewDiff = async (filePath) => {
  // To be implemented: Open Monaco diff editor
  console.log('View diff for', filePath)
}

</script>

<style scoped>
.ide-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  background-color: #1e1e1e;
  color: #cccccc;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  overflow: hidden;
}

.activity-bar {
  width: 50px;
  background-color: #333333;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 10px;
}
.activity-icon {
  width: 50px;
  height: 50px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 24px;
  color: #858585;
  cursor: pointer;
}
.activity-icon.active {
  color: #ffffff;
  border-left: 2px solid #007acc;
}

.sidebar {
  width: 250px;
  background-color: #252526;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #333;
}
.sidebar-header {
  padding: 10px 20px;
  font-size: 11px;
  letter-spacing: 1px;
  color: #bbbbbb;
}
.sidebar-content {
  flex-grow: 1;
  overflow-y: auto;
}

.main-area {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  position: relative;
}

.editor-tabs {
  display: flex;
  background-color: #2d2d2d;
  height: 35px;
  overflow-x: auto;
}
.tab {
  padding: 8px 15px;
  background-color: #2d2d2d;
  color: #969696;
  cursor: pointer;
  display: flex;
  align-items: center;
  border-right: 1px solid #1e1e1e;
}
.tab.active {
  background-color: #1e1e1e;
  color: #ffffff;
  border-top: 1px solid #007acc;
}
.tab-close {
  margin-left: 10px;
  font-size: 16px;
}
.tab-close:hover {
  color: #ff5555;
}

.editor-container {
  flex-grow: 1;
  overflow: hidden;
}

.terminal-panel {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #1e1e1e;
  border-top: 1px solid #333;
  display: flex;
  flex-direction: column;
  transition: height 0.3s ease;
  height: 35px;
}
.terminal-panel.is-open {
  height: 300px;
}
.terminal-header {
  height: 35px;
  padding: 0 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  background-color: #252526;
  font-size: 11px;
  letter-spacing: 1px;
}
.terminal-container {
  flex-grow: 1;
  padding: 10px;
  overflow: hidden;
}

/* Search Styles */
.search-input {
  width: 90%;
  margin: 10px 5%;
  padding: 5px;
  background: #3c3c3c;
  border: 1px solid #3c3c3c;
  color: white;
}
.search-result {
  padding: 5px 10px;
  cursor: pointer;
  border-bottom: 1px solid #333;
}
.search-result:hover {
  background: #2a2d2e;
}
.search-file {
  font-size: 12px;
  color: #cca700;
}
.search-snippet {
  font-size: 11px;
  color: #ccc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Git Styles */
.git-actions {
  padding: 10px;
}
.git-file {
  padding: 5px 15px;
  font-size: 13px;
  cursor: pointer;
}
.git-file:hover {
  background-color: #2a2d2e;
}
.git-file.modified { color: #e2c08d; }
.git-file.untracked { color: #73c991; }
</style>
