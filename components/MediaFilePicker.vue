<script setup lang="ts">
import { ref, computed } from 'vue'
import { mediaFileService, type MediaFile } from '../services/mediaFileService'
import { mediaFolderService, type MediaFolder } from '../services/mediaFolderService'
import FileInfoButton from './FileInfoButton.vue'
import FileInfoModal from './FileInfoModal.vue'

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
const selectedUploadFiles = ref<File[]>([])
const showUploadDialog = ref(false)
const showFileInfoDialog = ref(false)
const fileInfoToShow = ref<MediaFile | null>(null)

interface UploadProgress {
  filename: string
  percentage: number
  error?: string
}
const uploadProgress = ref<UploadProgress[]>([])

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
  const fileList = target.files
  if (!fileList || fileList.length === 0) return

  const filesToUpload: File[] = []

  // Check if file types are allowed
  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i]
    if (!file) continue

    if (props.acceptTypes.length > 0) {
      const isAllowed = props.acceptTypes.some(type => {
        if (type.endsWith('/*')) {
          const baseType = type.split('/')[0]
          return file.type.startsWith(baseType + '/')
        }
        return file.type === type
      })

      if (!isAllowed) {
        alert(`A fájl "${file.name}" típusa nem támogatott.`)
        continue
      }
    }

    filesToUpload.push(file)
  }

  if (filesToUpload.length === 0) {
    target.value = ''
    return
  }

  selectedUploadFiles.value = filesToUpload
  showUploadDialog.value = true
  target.value = ''
}

const removeUploadFile = (index: number) => {
  selectedUploadFiles.value.splice(index, 1)
}

const uploadFiles = async () => {
  if (selectedUploadFiles.value.length === 0) return

  uploading.value = true
  uploadProgress.value = selectedUploadFiles.value.map(file => ({
    filename: file.name,
    percentage: 0
  }))

  try {
    // Upload files sequentially to track individual progress
    for (let i = 0; i < selectedUploadFiles.value.length; i++) {
      const file = selectedUploadFiles.value[i]
      if (!file) continue

      const progressItem = uploadProgress.value[i]
      if (!progressItem) continue

      try {
        progressItem.percentage = 0

        // Simulate progress
        const progressInterval = setInterval(() => {
          const item = uploadProgress.value[i]
          if (item && item.percentage < 90) {
            item.percentage += 10
          }
        }, 100)

        const response = await mediaFileService.upload(file, currentFolderId.value)
        files.value.unshift(response.data.data)

        clearInterval(progressInterval)
        progressItem.percentage = 100
      } catch (error) {
        console.error(`Failed to upload file ${file.name}:`, error)
        progressItem.error = 'Feltöltési hiba'
        progressItem.percentage = 0
      }
    }

    // Wait a bit to show completion
    await new Promise(resolve => setTimeout(resolve, 500))

    const successCount = uploadProgress.value.filter(p => p.percentage === 100).length
    if (successCount > 0) {
      alert(`${successCount} fájl sikeresen feltöltve!`)
    }

    showUploadDialog.value = false
    selectedUploadFiles.value = []
    uploadProgress.value = []
  } catch (error) {
    console.error('Failed to upload files:', error)
    alert('Hiba történt a feltöltés során.')
  } finally {
    uploading.value = false
  }
}

const cancelUpload = () => {
  if (!uploading.value) {
    showUploadDialog.value = false
    selectedUploadFiles.value = []
    uploadProgress.value = []
  }
}

const showFileInfo = (file: MediaFile) => {
  fileInfoToShow.value = file
  showFileInfoDialog.value = true
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
                    multiple
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
                  <FileInfoButton :file="file" @show-info="showFileInfo" />
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

      <!-- Upload Dialog -->
      <div v-if="showUploadDialog" class="modal-overlay upload-modal-overlay" @click.self="cancelUpload">
        <div class="upload-modal-container">
          <div class="modal-header">
            <h3 class="modal-title">Fájlok Feltöltése</h3>
            <button @click="cancelUpload" class="close-button" :disabled="uploading">×</button>
          </div>

          <div class="modal-body">
            <div class="selected-files-list">
              <div v-for="(file, index) in selectedUploadFiles" :key="index" class="selected-file-item">
                <span class="file-name">{{ file.name }}</span>
                <span class="file-size">{{ formatFileSize(file.size) }}</span>
                <button
                  v-if="!uploading"
                  type="button"
                  @click="removeUploadFile(index)"
                  class="btn-remove"
                >×</button>
              </div>
            </div>

            <!-- Progress bars -->
            <div v-if="uploading && uploadProgress.length > 0" class="upload-progress-container">
              <div v-for="(progress, index) in uploadProgress" :key="index" class="progress-item">
                <div class="progress-header">
                  <span class="progress-filename">{{ progress.filename }}</span>
                  <span class="progress-percentage">{{ progress.percentage }}%</span>
                </div>
                <div class="progress-bar">
                  <div
                    class="progress-fill"
                    :style="{ width: progress.percentage + '%' }"
                    :class="{
                      'progress-complete': progress.percentage === 100,
                      'progress-error': progress.error
                    }"
                  ></div>
                </div>
                <div v-if="progress.error" class="progress-error-message">{{ progress.error }}</div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button @click="cancelUpload" :disabled="uploading" class="btn-secondary">
              {{ uploading ? 'Bezárás' : 'Mégse' }}
            </button>
            <button
              @click="uploadFiles"
              :disabled="uploading || selectedUploadFiles.length === 0"
              class="btn-primary"
            >
              {{ uploading ? 'Feltöltés...' : 'Feltölt' }}
            </button>
          </div>
        </div>
      </div>

      <!-- File Info Modal -->
      <FileInfoModal v-model="showFileInfoDialog" :file="fileInfoToShow" />
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

.upload-modal-overlay {
  z-index: 10000;
}

.upload-modal-container {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.selected-files-list {
  margin-bottom: 1.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 0.75rem;
  max-height: 200px;
  overflow-y: auto;
}

.selected-file-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 6px;
  margin-bottom: 0.5rem;
}

.selected-file-item:last-child {
  margin-bottom: 0;
}

.selected-file-item .file-name {
  flex: 1;
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.selected-file-item .file-size {
  font-size: 0.75rem;
  color: #6b7280;
  white-space: nowrap;
}

.selected-file-item .btn-remove {
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  padding: 0;
  flex-shrink: 0;
}

.selected-file-item .btn-remove:hover {
  background: #dc2626;
}

.upload-progress-container {
  margin-top: 1.5rem;
}

.progress-item {
  margin-bottom: 1rem;
}

.progress-item:last-child {
  margin-bottom: 0;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.progress-filename {
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  margin-right: 1rem;
}

.progress-percentage {
  font-size: 0.875rem;
  font-weight: 600;
  color: #3b82f6;
  white-space: nowrap;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #3b82f6;
  transition: width 0.3s ease;
  border-radius: 4px;
}

.progress-fill.progress-complete {
  background: #10b981;
}

.progress-fill.progress-error {
  background: #ef4444;
}

.progress-error-message {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: #ef4444;
}
</style>



