<template>
  <div class="folder-node">
    <div
      class="node-item"
      :class="{ active: selectedFolderId === folder.id }"
      :style="{ paddingLeft: `${depth * 12 + 12}px` }"
      @click.stop="handleSelect"
    >
      <button
        v-if="hasChildren"
        class="expand-btn"
        @click.stop="toggleExpand"
      >
        <Icon :name="isExpanded ? 'chevron-down' : 'chevron-right'" :size="14" />
      </button>
      <span v-else class="expand-placeholder"></span>

      <Icon name="folder" :size="16" class="mr-2 folder-icon" />
      <span class="folder-name">{{ folder.name }}</span>

      <div class="node-actions" @click.stop>
        <button class="action-btn" @click="$emit('edit-folder', folder)" title="Szerkesztés">
          <Icon name="edit" :size="14" />
        </button>
        <button class="action-btn delete-btn" @click="$emit('delete-folder', folder.id!)" title="Törlés">
          <Icon name="trash" :size="14" />
        </button>
      </div>
    </div>

    <div v-if="isExpanded && hasChildren" class="children">
      <FolderTreeNode
        v-for="child in childFolders"
        :key="child.id"
        :folder="child"
        :selected-folder-id="selectedFolderId"
        :all-folders="allFolders"
        :depth="depth + 1"
        @select-folder="$emit('select-folder', $event)"
        @edit-folder="$emit('edit-folder', $event)"
        @delete-folder="$emit('delete-folder', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Icon from '@admin/components/ui/Icon.vue'
import type { MediaFolder } from '../services/mediaFolderService'

// Enable recursive component
const FolderTreeNode = 'FolderTreeNode'

interface Props {
  folder: MediaFolder
  selectedFolderId: number | null
  allFolders: MediaFolder[]
  depth?: number
}

const props = withDefaults(defineProps<Props>(), {
  depth: 0
})

const emit = defineEmits<{
  'select-folder': [folderId: number]
  'edit-folder': [folder: MediaFolder]
  'delete-folder': [folderId: number]
}>()

const isExpanded = ref(false)

const childFolders = computed(() => {
  return props.allFolders.filter(f => f.parent_id === props.folder.id)
})

const hasChildren = computed(() => {
  return childFolders.value.length > 0
})

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}

const handleSelect = () => {
  emit('select-folder', props.folder.id!)
}
</script>

<style scoped>
.folder-node {
  user-select: none;
}

.node-item {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s;
  font-size: 14px;
  position: relative;
}

.node-item:hover {
  background-color: #f3f4f6;
}

.node-item.active {
  background-color: #dbeafe;
  color: #1d4ed8;
  font-weight: 500;
}

.node-item:hover .node-actions {
  opacity: 1;
}

.expand-btn {
  background: none;
  border: none;
  padding: 2px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 4px;
  color: #6b7280;
}

.expand-btn:hover {
  color: #374151;
}

.expand-placeholder {
  width: 18px;
  margin-right: 4px;
}

.folder-icon {
  color: #f59e0b;
}

.folder-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s;
  margin-left: 8px;
}

.action-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: #6b7280;
}

.action-btn:hover {
  background-color: #e5e7eb;
  color: #374151;
}

.delete-btn:hover {
  background-color: #fee2e2;
  color: #dc2626;
}

.children {
  margin-left: 0;
}
</style>



