<script setup lang="ts">
import { ref, computed } from 'vue'
import Button from '@admin/components/ui/button/Button.vue'
import Icon from '@admin/components/ui/Icon.vue'
import { mediaFileService, type MediaFile } from '../services/mediaFileService'
import { mediaFolderService, type MediaFolder } from '../services/mediaFolderService'
import FileInfoModal from './FileInfoModal.vue'
import UploadFile from './UploadFile.vue'
import MediaFilesGrid from './MediaFilesGrid.vue'
import FolderTree from './FolderTree.vue'

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
const showUploadDialog = ref(false)
const showFileInfoDialog = ref(false)
const fileInfoToShow = ref<MediaFile | null>(null)

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

const onFileUploaded = (file: MediaFile) => {
  files.value.unshift(file)
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
      <Button
        @click="openPicker"
        type="button"
        variant="primary"
        class="ml-2"
      >
        Tallózás
      </Button>
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
            <Button @click="cancelSelection" variant="ghost" size="icon" class="close-button">
              <Icon name="close" size="24" />
            </Button>
          </div>

          <div class="modal-body-container">
            <div class="sidebar">
              <FolderTree
                :folders="folders"
                :selected-folder-id="currentFolderId"
                @select-folder="selectFolder"
              />
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
                  <Button
                    @click="showUploadDialog = true"
                    variant="primary"
                    class="btn-upload w-full"
                  >
                    <Icon name="upload" size="18" class="inline mr-2" />
                    Új fájl feltöltése
                  </Button>
                </div>
              </div>

              <!-- Files Grid -->
              <MediaFilesGrid
                :files="filteredFiles"
                :loading="loading"
                :selected-file-id="selectedFile?.id"
                @select="selectFile"
                @show-info="showFileInfo"
              />
            </div>
          </div>

          <div class="modal-footer">
            <Button @click="cancelSelection" variant="outline">
              Mégse
            </Button>
            <Button
              @click="confirmSelection"
              :disabled="!selectedFile"
              variant="primary"
            >
              Kiválaszt
            </Button>
          </div>
        </div>
      </div>

      <!-- Upload Dialog -->
      <UploadFile
        v-model:show="showUploadDialog"
        :accept-types="acceptTypes"
        :current-folder-id="currentFolderId"
        @uploaded="onFileUploaded"
      />

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

.modal-body-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 250px;
  border-right: 1px solid #e5e7eb;
  background: #f9fafb;
  overflow-y: auto;
  flex-shrink: 0;
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

.btn-upload:hover:not(:disabled) {
  background: #059669;
}

.btn-upload:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-select-files {
  display: inline-block;
  padding: 0.5rem 1rem;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-select-files:hover:not(.disabled) {
  background: #e5e7eb;
  border-color: #9ca3af;
}

.btn-select-files.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.separator-container {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: #9ca3af;
  font-size: 0.75rem;
  font-weight: 600;
}

.separator-line {
  flex: 1;
  height: 1px;
  background-color: #e5e7eb;
}

.separator-text {
  flex: 0 0 auto;
}

.file-input-hidden {
  display: none;
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

.separator {
  text-align: center;
  position: relative;
  font-size: 12px;
  color: #6b7280;
  font-weight: 600;
}

.separator::before,
.separator::after {
  content: "";
  position: absolute;
  top: 50%;
  width: 40%;
  height: 1px;
  background: #e5e7eb;
}

.separator::before {
  left: 0;
}

.separator::after {
  right: 0;
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



