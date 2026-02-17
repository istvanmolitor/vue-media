<template>
  <Teleport to="body">
    <div v-if="modelValue && file" class="modal-overlay file-info-modal-overlay" @click.self="close">
      <div class="file-info-modal-container">
        <div class="modal-header">
          <h3 class="modal-title">Fájl Információk</h3>
          <button @click="close" class="close-button">×</button>
        </div>

        <div class="modal-body">
          <div class="file-info-content">
            <!-- Preview -->
            <div class="info-preview-section">
              <div class="info-preview">
                <img
                  v-if="isImage(file.mime_type)"
                  :src="file.download_url || file.url"
                  :alt="file.name"
                  class="info-preview-image"
                />
                <div v-else class="info-preview-icon">
                  {{ getFileIcon(file.mime_type) }}
                </div>
              </div>
            </div>

            <!-- Details -->
            <div class="info-details-section">
              <div class="info-row">
                <span class="info-label">Név:</span>
                <span class="info-value">{{ file.name }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Fájlnév:</span>
                <span class="info-value">{{ file.filename }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Méret:</span>
                <span class="info-value">{{ formatFileSize(file.size) }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Típus:</span>
                <span class="info-value">{{ file.mime_type }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Szélesség:</span>
                <span class="info-value">{{ file.width ?? 'N/A' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Magasság:</span>
                <span class="info-value">{{ file.height ?? 'N/A' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Feltöltve:</span>
                <span class="info-value">{{ formatDate(file.created_at) }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Módosítva:</span>
                <span class="info-value">{{ formatDate(file.updated_at) }}</span>
              </div>
              <div v-if="file.path" class="info-row">
                <span class="info-label">Útvonal:</span>
                <span class="info-value info-value-small">{{ file.path }}</span>
              </div>
              <div v-if="file.download_url || file.url" class="info-row">
                <span class="info-label">URL:</span>
                <a
                  :href="file.download_url || file.url"
                  target="_blank"
                  class="info-value info-link"
                >
                  Megnyitás új ablakban ↗
                </a>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="close" class="btn-primary">
            Bezárás
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { MediaFile } from '../services/mediaFileService'

interface Props {
  modelValue: boolean
  file: MediaFile | null
}

defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const close = () => {
  emit('update:modelValue', false)
}

const isImage = (mimeType: string) => {
  return mimeType.startsWith('image/')
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType.startsWith('video/')) return '🎥'
  if (mimeType.startsWith('audio/')) return '🎵'
  if (mimeType.includes('pdf')) return '📄'
  return '📎'
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleString('hu-HU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.file-info-modal-overlay {
  z-index: 10001;
}

.file-info-modal-container {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 700px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.close-button:hover {
  background-color: #f3f4f6;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.file-info-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.info-preview-section {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
}

.info-preview {
  max-width: 100%;
  max-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.info-preview-image {
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
  border-radius: 4px;
}

.info-preview-icon {
  font-size: 6rem;
}

.info-details-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.info-row {
  display: flex;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 6px;
  gap: 1rem;
}

.info-label {
  font-weight: 600;
  color: #374151;
  min-width: 100px;
  flex-shrink: 0;
}

.info-value {
  color: #6b7280;
  word-break: break-word;
  flex: 1;
}

.info-value-small {
  font-size: 0.875rem;
  font-family: monospace;
}

.info-link {
  color: #3b82f6;
  text-decoration: none;
  transition: color 0.2s;
}

.info-link:hover {
  color: #2563eb;
  text-decoration: underline;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.btn-primary:hover {
  background-color: #2563eb;
}
</style>


