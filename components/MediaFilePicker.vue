<script setup lang="ts">
import { ref, computed } from 'vue'
import { mediaFileService, type MediaFile } from '../services/mediaFileService'
import { mediaFolderService, type MediaFolder } from '../services/mediaFolderService'

interface Props {
  modelValue?: string
  acceptTypes?: string[]  // e.g., ['image/jpeg', 'image/png']
  showPreview?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  acceptTypes: () => [],
  showPreview: true
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'select': [file: MediaFile]
}>()

const showDialog = ref(false)
const files = ref<MediaFile[]>([])
const folders = ref<MediaFolder[]>([])
const currentFolderId = ref<number | null>(null)
const loading = ref(false)
const searchQuery = ref('')
const selectedFile = ref<MediaFile | null>(null)
const uploading = ref(false)
const uploadProgress = ref(0)

const filteredFiles = computed(() => {
  let result = files.value

  // Filter by accept types if specified
  if (props.acceptTypes.length > 0) {
    result = result.filter(file =>
      props.acceptTypes.some(type => {
        if (type.endsWith('/*')) {
          const baseType = type.split('/')[0]
          return file.mime_type.startsWith(baseType + '/')
        }
        return file.mime_type === type
      })
    )
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(file =>
      file.name.toLowerCase().includes(query) ||
      file.filename.toLowerCase().includes(query)
    )
  }

  return result
})

const loadFolders = async () => {
  try {
    const response = await mediaFolderService.getAll()
    folders.value = response.data.data
  } catch (error) {
    console.error('Failed to load folders:', error)
  }
}

const loadFiles = async () => {
  loading.value = true
  try {
    const params = currentFolderId.value
      ? { folder_id: currentFolderId.value }
      : undefined
    const response = await mediaFileService.getAll(params)
    files.value = response.data.data
  } catch (error) {
    console.error('Failed to load files:', error)
  } finally {
    loading.value = false
  }
}

const openPicker = () => {
  showDialog.value = true
  loadFolders()
  loadFiles()
}

const selectFolder = (folderId: number | null) => {
  currentFolderId.value = folderId
  loadFiles()
}

const selectFile = (file: MediaFile) => {
  selectedFile.value = file
}

const confirmSelection = () => {
  if (selectedFile.value) {
    const url = selectedFile.value.download_url || selectedFile.value.url || selectedFile.value.path
    emit('update:modelValue', url)
    emit('select', selectedFile.value)
    showDialog.value = false
    selectedFile.value = null
  }
}

const cancelSelection = () => {
  showDialog.value = false
  selectedFile.value = null
  searchQuery.value = ''
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

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // Check if file type is allowed
  if (props.acceptTypes.length > 0) {
    const isAllowed = props.acceptTypes.some(type => {
      if (type.endsWith('/*')) {
        const baseType = type.split('/')[0]
        return file.type.startsWith(baseType + '/')
      }
      return file.type === type
    })

    if (!isAllowed) {
      alert('Ez a fájltípus nem támogatott.')
      target.value = ''
      return
    }
  }

  uploading.value = true
  uploadProgress.value = 0

  try {
    const response = await mediaFileService.upload(file, currentFolderId.value)
    files.value.unshift(response.data.data)
    alert('Fájl sikeresen feltöltve!')
    target.value = ''
  } catch (error) {
    console.error('Failed to upload file:', error)
    alert('Hiba történt a feltöltés során.')
  } finally {
    uploading.value = false
    uploadProgress.value = 0
  }
}
</script>

<template>
  <div class="media-file-picker">
    <div class="input-group">
      <input
        :value="modelValue"
        type="text"
        readonly
        class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        placeholder="Válassz egy fájlt..."
      />
      <button
        @click="openPicker"
        type="button"
        class="ml-2 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
      >
        Tallózás
      </button>
    </div>

    <div v-if="showPreview && modelValue" class="preview mt-4">
      <img
        v-if="modelValue"
        :src="modelValue"
        alt="Preview"
        class="max-w-xs rounded-lg shadow-sm border border-border"
      />
    </div>

    <!-- Modal Dialog -->
    <Teleport to="body">
      <div v-if="showDialog" class="modal-overlay" @click.self="cancelSelection">
        <div class="modal-container">
          <div class="modal-header">
            <h3 class="modal-title">Média Kiválasztása</h3>
            <button @click="cancelSelection" class="close-button">×</button>
          </div>

          <div class="modal-body">
            <!-- Search and Folder Navigation -->
            <div class="toolbar">
              <div class="search-box">
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Keresés..."
                  class="search-input"
                />
              </div>
              <div class="upload-section">
                <label class="btn-upload" :class="{ disabled: uploading }">
                  <input
                    type="file"
                    @change="handleFileUpload"
                    :disabled="uploading"
                    :accept="acceptTypes.join(',')"
                    class="file-input-hidden"
                  />
                  {{ uploading ? 'Feltöltés...' : '📤 Új fájl feltöltése' }}
                </label>
              </div>
              <div class="folder-navigation">
                <button
                  @click="selectFolder(null)"
                  :class="['folder-button', { active: currentFolderId === null }]"
                >
                  Gyökér
                </button>
                <button
                  v-for="folder in folders"
                  :key="folder.id"
                  @click="selectFolder(folder.id!)"
                  :class="['folder-button', { active: currentFolderId === folder.id }]"
                >
                  {{ folder.name }}
                </button>
              </div>
            </div>

            <!-- Files Grid -->
            <div class="files-section">
              <div v-if="loading" class="loading-state">
                Betöltés...
              </div>
              <div v-else-if="filteredFiles.length === 0" class="empty-state">
                Nincsenek fájlok
              </div>
              <div v-else class="files-grid">
                <div
                  v-for="file in filteredFiles"
                  :key="file.id"
                  @click="selectFile(file)"
                  :class="['file-card', { selected: selectedFile?.id === file.id }]"
                >
                  <div class="file-preview">
                    <img
                      v-if="isImage(file.mime_type)"
                      :src="file.download_url || file.url"
                      :alt="file.name"
                      class="file-image"
                    />
                    <div v-else class="file-icon">
                      {{ getFileIcon(file.mime_type) }}
                    </div>
                  </div>
                  <div class="file-info">
                    <div class="file-name" :title="file.name">{{ file.name }}</div>
                    <div class="file-meta">{{ formatFileSize(file.size) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button @click="cancelSelection" class="btn-secondary">
              Mégse
            </button>
            <button
              @click="confirmSelection"
              :disabled="!selectedFile"
              class="btn-primary"
            >
              Kiválaszt
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.media-file-picker {
  width: 100%;
}

.input-group {
  display: flex;
  align-items: center;
}

.preview {
  margin-top: 1rem;
}

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
  z-index: 9999;
}

.modal-container {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 1000px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.close-button {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.close-button:hover {
  background: #f3f4f6;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.toolbar {
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.search-box {
  width: 100%;
}

.search-input {
  width: 100%;
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.upload-section {
  width: 100%;
}

.btn-upload {
  display: inline-block;
  padding: 0.5rem 1rem;
  background: #10b981;
  color: white;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-upload:hover:not(.disabled) {
  background: #059669;
}

.btn-upload.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.file-input-hidden {
  display: none;
}

.folder-navigation {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.folder-button {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.folder-button:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.folder-button.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

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

.modal-footer {
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.btn-secondary,
.btn-primary {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-secondary {
  background: white;
  border: 1px solid #d1d5db;
  color: #374151;
}

.btn-secondary:hover {
  background: #f9fafb;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>



