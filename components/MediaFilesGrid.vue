<script setup lang="ts">
import Icon from '@admin/components/ui/Icon.vue'
import { type MediaFile } from '../services/mediaFileService'
import { formatFileSize, isImage, getFileIcon } from '../utils/mediaUtils'
import FileInfoButton from './FileInfoButton.vue'

interface Props {
  files: MediaFile[]
  loading?: boolean
  selectedFileId?: number | null
}

defineProps<Props>()

const emit = defineEmits<{
  'select': [file: MediaFile]
  'show-info': [file: MediaFile]
}>()

const selectFile = (file: MediaFile) => {
  emit('select', file)
}

const showFileInfo = (file: MediaFile) => {
  emit('show-info', file)
}
</script>

<template>
  <div class="files-section">
    <div v-if="loading" class="loading-state">
      Betöltés...
    </div>
    <div v-else-if="files.length === 0" class="empty-state">
      Nincsenek fájlok
    </div>
    <div v-else class="files-grid">
      <div
        v-for="file in files"
        :key="file.id"
        @click="selectFile(file)"
        :class="['file-card', { selected: selectedFileId === file.id }]"
      >
        <FileInfoButton :file="file" @show-info="showFileInfo" />
        <div class="file-preview">
          <img
            v-if="isImage(file.mime_type)"
            :src="file.download_url || file.url"
            :alt="file.name"
            class="file-image"
          />
          <div v-else class="file-icon">
            <Icon :name="getFileIcon(file.mime_type)" size="48" color="#6b7280" />
          </div>
        </div>
        <div class="file-info">
          <div class="file-name" :title="file.name">{{ file.name }}</div>
          <div class="file-meta">{{ formatFileSize(file.size) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.files-section {
  min-height: 300px;
}

.loading-state,
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  color: #6b7280;
}

.files-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
}

.file-card {
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
  position: relative;
}

.file-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.file-card.selected {
  border-color: #3b82f6;
  background: #eff6ff;
  box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);
}

.file-preview {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.file-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.file-icon {
  font-size: 3rem;
}

.file-info {
  text-align: center;
}

.file-name {
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-meta {
  font-size: 0.75rem;
  color: #6b7280;
}
</style>
