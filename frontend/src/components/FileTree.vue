<template>
  <div class="file-tree">
    <div 
      v-for="file in files" 
      :key="file.path" 
      class="file-item" 
      :class="{ 'is-directory': file.isDirectory }"
    >
      <div 
        class="file-label" 
        @click="handleClick(file)"
      >
        <i class="fas" :class="getIcon(file)"></i>
        <span class="file-name">{{ file.name }}</span>
      </div>
      
      <!-- Recursive Tree for Subdirectories -->
      <div v-if="file.isDirectory && expandedFolders[file.path]" class="sub-tree">
        <FileTree 
          v-if="folderContents[file.path]" 
          :files="folderContents[file.path]" 
          :appId="appId"
          @file-selected="$emit('file-selected', $event)" 
        />
        <div v-else class="loading-tree">Loading...</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import api from '../api'

const props = defineProps({
  files: Array,
  appId: String
})
const emit = defineEmits(['file-selected'])

const expandedFolders = ref({})
const folderContents = ref({})

const handleClick = async (file) => {
  if (file.isDirectory) {
    // Toggle folder
    expandedFolders.value[file.path] = !expandedFolders.value[file.path]
    
    // Fetch contents if expanding and we don't have it
    if (expandedFolders.value[file.path] && !folderContents.value[file.path]) {
      try {
        const res = await api.get(`/api/files/${props.appId}/list?path=${encodeURIComponent(file.path)}`)
        folderContents.value[file.path] = res.data
      } catch (e) {
        console.error('Failed to fetch folder', e)
      }
    }
  } else {
    // File selected
    emit('file-selected', file.path)
  }
}

const getIcon = (file) => {
  if (file.isDirectory) {
    return expandedFolders.value[file.path] ? 'fa-folder-open' : 'fa-folder'
  }
  
  const ext = file.name.split('.').pop().toLowerCase()
  const iconMap = {
    'js': 'fa-js text-warning',
    'vue': 'fa-vuejs text-success',
    'html': 'fa-html5 text-danger',
    'css': 'fa-css3 text-primary',
    'json': 'fa-code text-warning',
    'md': 'fa-markdown text-info',
    'png': 'fa-image text-primary',
    'jpg': 'fa-image text-primary',
    'jpeg': 'fa-image text-primary',
    'svg': 'fa-image text-primary',
    'pdf': 'fa-file-pdf text-danger',
  }
  return iconMap[ext] || 'fa-file'
}
</script>

<style scoped>
.file-tree {
  font-size: 13px;
  color: #cccccc;
}
.file-item {
  user-select: none;
}
.file-label {
  display: flex;
  align-items: center;
  padding: 4px 10px;
  cursor: pointer;
  white-space: nowrap;
}
.file-label:hover {
  background-color: #2a2d2e;
}
.file-label i {
  width: 20px;
  text-align: center;
  margin-right: 5px;
}
.sub-tree {
  padding-left: 15px;
  border-left: 1px solid #333;
  margin-left: 19px;
}
.loading-tree {
  padding: 5px 20px;
  color: #888;
  font-size: 11px;
}

/* Custom colors for extensions */
.text-warning { color: #cca700; }
.text-success { color: #41b883; }
.text-danger { color: #e34c26; }
.text-primary { color: #264de4; }
.text-info { color: #519aba; }
</style>
