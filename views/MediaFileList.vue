<template>
  <AdminLayout>
    <div class="media-files-container">
      <div class="header">
        <h2>Media Files</h2>
        <div class="actions">
          <button @click="showUploadDialog = true" class="btn btn-primary">
            <Icon name="upload" :size="16" class="mr-2" />
            Upload File
          </button>
        </div>
      </div>

    <!-- Folder Navigation -->
    <div class="folder-breadcrumb" v-if="currentFolderId">
      <button @click="navigateToFolder(null)" class="breadcrumb-item">Root</button>
      <span class="separator">/</span>
      <span class="breadcrumb-item current">{{ currentFolderName }}</span>
    </div>

    <!-- Folders List -->
    <div class="folders-section" v-if="folders.length > 0">
      <h3>Folders</h3>
      <div class="folders-grid">
        <div
          v-for="folder in folders"
          :key="folder.id"
          @click="navigateToFolder(folder.id!)"
          class="folder-card"
        >
          <div class="folder-icon">📁</div>
          <div class="folder-name">{{ folder.name }}</div>
        </div>
      </div>
    </div>

    <!-- Files List -->
    <div class="files-section">
      <h3>Files</h3>
      <div v-if="loading" class="loading">Loading...</div>
      <div v-else-if="files.length === 0" class="empty-state">
        No files found
      </div>
      <div v-else class="files-grid">
        <div
          v-for="file in files"
          :key="file.id"
          class="file-card"
        >
          <div class="file-preview">
            <img
              v-if="isImage(file.mime_type)"
              :src="file.url"
              :alt="file.name"
              class="file-image"
            />
            <div v-else class="file-icon">📄</div>
          </div>
          <div class="file-info">
            <div class="file-name" :title="file.filename">{{ file.name }}</div>
            <div class="file-meta">
              <span class="file-size">{{ formatFileSize(file.size) }}</span>
            </div>
          </div>
          <div class="file-actions">
            <button @click="downloadFile(file)" class="btn-icon" title="Download">
              ⬇️
            </button>
            <button @click="deleteFile(file)" class="btn-icon btn-danger" title="Delete">
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Upload Dialog -->
    <div v-if="showUploadDialog" class="modal-overlay" @click="showUploadDialog = false">
      <div class="modal-content" @click.stop>
        <h3>Upload File</h3>
        <form @submit.prevent="uploadFile">
          <div class="form-group">
            <label>File</label>
            <input
              type="file"
              @change="handleFileSelect"
              required
              class="form-control"
            />
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea
              v-model="uploadDescription"
              class="form-control"
              rows="3"
            ></textarea>
          </div>
          <div class="form-actions">
            <button type="button" @click="showUploadDialog = false" class="btn btn-secondary">
              <Icon name="x" :size="16" class="mr-2" />
              Cancel
            </button>
            <button type="submit" :disabled="uploading" class="btn btn-primary">
              <Icon :name="uploading ? 'loader' : 'save'" :size="16" :class="['mr-2', uploading ? 'animate-spin' : '']" />
              {{ uploading ? 'Uploading...' : 'Upload' }}
            </button>
          </div>
        </form>
      </div>
    </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AdminLayout from '@admin/components/layout/DashboardLayout.vue'
import Icon from '@admin/components/ui/Icon.vue'
import { mediaFileService, type MediaFile } from '../services/mediaFileService'
import { mediaFolderService, type MediaFolder } from '../services/mediaFolderService'

const files = ref<MediaFile[]>([])
const folders = ref<MediaFolder[]>([])
const loading = ref(false)
const showUploadDialog = ref(false)
const selectedFile = ref<File | null>(null)
const uploadDescription = ref('')
const uploading = ref(false)
const currentFolderId = ref<number | null>(null)
const currentFolderName = ref('')

const loadFiles = async () => {
  loading.value = true
  try {
    const params = currentFolderId.value ? { folder_id: currentFolderId.value } : {}
    const response = await mediaFileService.getAll(params)
    files.value = response.data.data
  } catch (error) {
    console.error('Failed to load files:', error)
  } finally {
    loading.value = false
  }
}

const loadFolders = async () => {
  try {
    const params = currentFolderId.value ? { parent_id: currentFolderId.value } : {}
    const response = await mediaFolderService.getAll(params)
    folders.value = response.data.data
  } catch (error) {
    console.error('Failed to load folders:', error)
  }
}

const navigateToFolder = async (folderId: number | null) => {
  currentFolderId.value = folderId
  if (folderId) {
    const response = await mediaFolderService.getById(folderId)
    currentFolderName.value = response.data.data.name
  } else {
    currentFolderName.value = ''
  }
  loadFiles()
  loadFolders()
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0] ?? null
  }
}

const uploadFile = async () => {
  if (!selectedFile.value) return

  uploading.value = true
  try {
    await mediaFileService.upload(
      selectedFile.value,
      currentFolderId.value,
      uploadDescription.value
    )
    showUploadDialog.value = false
    selectedFile.value = null
    uploadDescription.value = ''
    await loadFiles()
  } catch (error) {
    console.error('Failed to upload file:', error)
    alert('Failed to upload file')
  } finally {
    uploading.value = false
  }
}

const deleteFile = async (file: MediaFile) => {
  if (!confirm(`Are you sure you want to delete "${file.name}"?`)) return

  try {
    await mediaFileService.delete(file.id!)
    await loadFiles()
  } catch (error) {
    console.error('Failed to delete file:', error)
    alert('Failed to delete file')
  }
}

const downloadFile = (file: MediaFile) => {
  if (file.url) {
    window.open(file.url, '_blank')
  }
}

const isImage = (mimeType: string) => {
  return mimeType.startsWith('image/')
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

onMounted(() => {
  loadFiles()
  loadFolders()
})
</script>

<style scoped>
.media-files-container {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.folder-breadcrumb {
  margin-bottom: 20px;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;
}

.breadcrumb-item {
  background: none;
  border: none;
  color: #0066cc;
  cursor: pointer;
  padding: 0;
  font-size: 14px;
}

.breadcrumb-item.current {
  color: #333;
  cursor: default;
}

.separator {
  margin: 0 8px;
}

.folders-section,
.files-section {
  margin-bottom: 30px;
}

.folders-grid,
.files-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 10px;
}

.folder-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.folder-card:hover {
  background: #f5f5f5;
  border-color: #0066cc;
}

.folder-icon {
  font-size: 48px;
  margin-bottom: 10px;
}

.folder-name {
  font-weight: 500;
}

.file-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  transition: box-shadow 0.2s;
}

.file-card:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.file-preview {
  width: 100%;
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}

.file-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.file-icon {
  font-size: 48px;
}

.file-info {
  padding: 12px;
}

.file-name {
  font-weight: 500;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-meta {
  font-size: 12px;
  color: #666;
}

.file-actions {
  display: flex;
  gap: 8px;
  padding: 0 12px 12px;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  padding: 4px 8px;
  border-radius: 4px;
}

.btn-icon:hover {
  background: #f5f5f5;
}

.btn-icon.btn-danger:hover {
  background: #fee;
}

.loading,
.empty-state {
  text-align: center;
  padding: 40px;
  color: #666;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 24px;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-weight: 500;
}

.form-control {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 20px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.btn-primary {
  background: #0066cc;
  color: white;
}

.btn-primary:hover {
  background: #0052a3;
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f5f5f5;
  color: #333;
}

.btn-secondary:hover {
  background: #e5e5e5;
}
</style>
