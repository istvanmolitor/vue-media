<template>
  <div class="folder-tree">
    <div class="tree-header">
      <h3 class="text-lg font-semibold mb-4">Mappák</h3>
      <Button size="sm" @click="$emit('create-folder')">
        <Icon name="plus" :size="14" class="mr-1" />
        Új Mappa
      </Button>
    </div>

    <div v-if="loading" class="loading">
      Betöltés...
    </div>

    <div v-else class="tree-content">
      <!-- Root level (no folder selected) -->
      <div
        class="tree-item"
        :class="{ active: selectedFolderId === null }"
        @click="$emit('select-folder', null)"
      >
        <Icon name="home" :size="16" class="mr-2" />
        <span>Gyökér</span>
      </div>

      <!-- Folder tree -->
      <FolderTreeNode
        v-for="folder in rootFolders"
        :key="folder.id"
        :folder="folder"
        :selected-folder-id="selectedFolderId"
        :all-folders="folders"
        @select-folder="$emit('select-folder', $event)"
        @edit-folder="$emit('edit-folder', $event)"
        @delete-folder="$emit('delete-folder', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Button from '@admin/components/ui/button/Button.vue'
import Icon from '@admin/components/ui/Icon.vue'
import type { MediaFolder } from '../services/mediaFolderService'

// FolderTreeNode will be resolved automatically from the same directory
import FolderTreeNode from './FolderTreeNode.vue'

interface Props {
  folders: MediaFolder[]
  selectedFolderId: number | null
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

defineEmits<{
  'select-folder': [folderId: number | null]
  'create-folder': []
  'edit-folder': [folder: MediaFolder]
  'delete-folder': [folderId: number]
}>()

const rootFolders = computed(() => {
  return props.folders.filter(folder => !folder.parent_id)
})
</script>

<style scoped>
.folder-tree {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tree-header {
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.tree-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.tree-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s;
  font-size: 14px;
}

.tree-item:hover {
  background-color: #f3f4f6;
}

.tree-item.active {
  background-color: #dbeafe;
  color: #1d4ed8;
  font-weight: 500;
}

.loading {
  padding: 20px;
  text-align: center;
  color: #6b7280;
}
</style>


