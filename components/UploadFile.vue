<script setup lang="ts">
import { ref } from 'vue'
import Button from '@admin/components/ui/button/Button.vue'
import Icon from '@admin/components/ui/Icon.vue'
import { mediaFileService, type MediaFile } from '../services/mediaFileService'
import { formatFileSize } from '../utils/mediaUtils'

interface Props {
  show: boolean
  acceptTypes?: string[]
  currentFolderId?: number | null
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  acceptTypes: () => [],
  currentFolderId: null
})

const emit = defineEmits<{
  'update:show': [value: boolean]
  'uploaded': [file: MediaFile]
  'close': []
}>()

const uploading = ref(false)
const selectedUploadFiles = ref<File[]>([])
const uploadUrl = ref('')

interface UploadProgress {
  filename: string
  percentage: number
  error?: string
}
const uploadProgress = ref<UploadProgress[]>([])

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const fileList = target.files
  if (!fileList || fileList.length === 0) return

  const filesToUpload: File[] = []

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

  selectedUploadFiles.value = [...selectedUploadFiles.value, ...filesToUpload]
  target.value = ''
}

const removeUploadFile = (index: number) => {
  selectedUploadFiles.value.splice(index, 1)
}

const uploadFiles = async () => {
  if (selectedUploadFiles.value.length === 0 && !uploadUrl.value) return

  uploading.value = true

  try {
    if (uploadUrl.value) {
      uploadProgress.value = [{
        filename: uploadUrl.value,
        percentage: 0
      }]

      const response = await mediaFileService.uploadFromUrl(uploadUrl.value, props.currentFolderId)
      emit('uploaded', response.data.data)
      uploadProgress.value[0].percentage = 100
    } else {
      uploadProgress.value = selectedUploadFiles.value.map(file => ({
        filename: file.name,
        percentage: 0
      }))

      for (let i = 0; i < selectedUploadFiles.value.length; i++) {
        const file = selectedUploadFiles.value[i]
        if (!file) continue

        const progressItem = uploadProgress.value[i]
        if (!progressItem) continue

        try {
          progressItem.percentage = 0
          const progressInterval = setInterval(() => {
            const item = uploadProgress.value[i]
            if (item && item.percentage < 90) {
              item.percentage += 10
            }
          }, 100)

          const response = await mediaFileService.upload(file, props.currentFolderId)
          emit('uploaded', response.data.data)

          clearInterval(progressInterval)
          progressItem.percentage = 100
        } catch (error) {
          console.error(`Failed to upload file ${file.name}:`, error)
          progressItem.error = 'Feltöltési hiba'
          progressItem.percentage = 0
        }
      }
    }

    await new Promise(resolve => setTimeout(resolve, 500))

    const successCount = uploadProgress.value.filter(p => p.percentage === 100).length
    if (successCount > 0) {
      alert(`${successCount} fájl sikeresen feldolgozva!`)
    }

    close()
  } catch (error) {
    console.error('Failed to upload:', error)
    alert('Hiba történt a művelet során.')
  } finally {
    uploading.value = false
  }
}

const close = () => {
  if (!uploading.value) {
    emit('update:show', false)
    emit('close')
    selectedUploadFiles.value = []
    uploadUrl.value = ''
    uploadProgress.value = []
  }
}
</script>

<template>
  <div v-if="show" class="modal-overlay upload-modal-overlay" @click.self="close">
    <div class="upload-modal-container">
      <div class="modal-header">
        <h3 class="modal-title">Fájlok Feltöltése</h3>
        <Button @click="close" variant="ghost" size="icon" class="close-button" :disabled="uploading">
          <Icon name="close" size="24" />
        </Button>
      </div>

      <div class="modal-body">
        <div class="form-group mb-4" v-if="!uploading">
          <label class="block text-sm font-medium mb-1">Média URL letöltése</label>
          <div class="flex gap-2">
            <input
              v-model="uploadUrl"
              type="text"
              placeholder="https://example.com/image.jpg"
              class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="selectedUploadFiles.length > 0"
            />
          </div>
        </div>

        <div class="separator-container mb-4" v-if="!uploading && !uploadUrl && selectedUploadFiles.length === 0">
          <div class="separator-line"></div>
          <div class="separator-text">VAGY</div>
          <div class="separator-line"></div>
        </div>

        <div class="form-group mb-4" v-if="!uploading && !uploadUrl">
          <label class="block text-sm font-medium mb-1">Fájlok kiválasztása</label>
          <label class="btn-select-files" :class="{ disabled: uploading }">
            <input
              type="file"
              @change="handleFileUpload"
              :disabled="uploading"
              :accept="acceptTypes.join(',')"
              class="file-input-hidden"
              multiple
            />
            <Icon name="folder" size="18" class="inline mr-2" /> Tallózás...
          </label>
        </div>

        <div class="selected-files-list" v-if="selectedUploadFiles.length > 0">
          <div v-for="(file, index) in selectedUploadFiles" :key="index" class="selected-file-item">
            <span class="file-name">{{ file.name }}</span>
            <span class="file-size">{{ formatFileSize(file.size) }}</span>
            <Button
              v-if="!uploading"
              type="button"
              @click="removeUploadFile(index)"
              variant="destructive"
              size="icon-sm"
              class="rounded-full"
            >
              <Icon name="close" size="16" />
            </Button>
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
        <Button @click="close" :disabled="uploading" variant="outline">
          {{ uploading ? 'Bezárás' : 'Mégse' }}
        </Button>
        <Button
          @click="uploadFiles"
          :disabled="uploading || (selectedUploadFiles.length === 0 && !uploadUrl)"
          variant="primary"
        >
          {{ uploading ? 'Feltöltés...' : 'Feltölt' }}
        </Button>
      </div>
    </div>
  </div>
</template>

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
  z-index: 9999;
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

.selected-file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  border-bottom: 1px solid #f3f4f6;
}

.selected-file-item:last-child {
  border-bottom: none;
}

.file-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 1rem;
}

.file-size {
  font-size: 0.75rem;
  color: #6b7280;
  margin-right: 1rem;
}

.btn-remove {
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-remove:hover {
  background: #fee2e2;
}

.upload-progress-container {
  margin-top: 1rem;
}

.progress-item {
  margin-bottom: 1rem;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.25rem;
  font-size: 0.75rem;
}

.progress-filename {
  font-weight: 500;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 80%;
}

.progress-percentage {
  color: #6b7280;
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
}

.progress-complete {
  background: #10b981;
}

.progress-error {
  background: #ef4444;
}

.progress-error-message {
  font-size: 0.75rem;
  color: #ef4444;
  margin-top: 0.25rem;
}
</style>
