<template>
  <AdminLayout>
    <div class="media-container">
      <!-- Left Sidebar - Folder Tree -->
      <div class="sidebar">
        <FolderTree
          :folders="folders"
          :selected-folder-id="currentFolderId"
          :loading="foldersLoading"
          @select-folder="navigateToFolder"
          @create-folder="showCreateFolderDialog = true"
          @edit-folder="editFolder"
          @delete-folder="confirmDeleteFolder"
        />
      </div>

      <!-- Main Content - Files List -->
      <div class="main-content">
        <div class="header">
          <div class="header-title">
            <h2>{{ currentFolderName || 'Gyökér' }}</h2>
            <span v-if="files.length > 0" class="file-count">{{ files.length }} fájl</span>
          </div>
          <div class="actions">
            <button @click="showUploadDialog = true" class="btn btn-primary">
              <Icon name="upload" :size="16" class="mr-2" />
              Fájl Feltöltése
            </button>
          </div>
        </div>

        <!-- Files List -->
        <div class="files-section">
          <div v-if="loading" class="loading">Betöltés...</div>
          <div v-else-if="files.length === 0" class="empty-state">
            Nincsenek fájlok
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
                  :src="file.download_url || file.url"
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
                <button @click="downloadFile(file)" class="btn-icon" title="Letöltés">
                  <Icon name="download" :size="20" />
                </button>
                <button @click="confirmDelete(file)" class="btn-icon btn-danger" title="Törlés">
                  <Icon name="trash" :size="20" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Upload Dialog -->
    <div v-if="showUploadDialog" class="modal-overlay" @click="showUploadDialog = false">
      <div class="modal-content" @click.stop>
        <h3>Fájl Feltöltése</h3>
        <form @submit.prevent="uploadFile">
          <div class="form-group">
            <Label>Fájl</Label>
            <input
              type="file"
              @change="handleFileSelect"
              required
              class="form-control"
            />
          </div>
          <div class="form-group">
            <Label>Leírás</Label>
            <Textarea
              v-model="uploadDescription"
              placeholder="Opcionális leírás"
              :rows="3"
            />
          </div>
          <FormButtons
            :is-saving="uploading"
            @cancel="showUploadDialog = false"
          />
        </form>
      </div>
    </div>

    <!-- Folder Create/Edit Dialog -->
    <div v-if="showCreateFolderDialog || showEditFolderDialog" class="modal-overlay" @click="closeFolderDialogs">
      <div class="modal-content" @click.stop>
        <h3>{{ showEditFolderDialog ? 'Mappa Szerkesztése' : 'Új Mappa' }}</h3>
        <form @submit.prevent="saveFolder">
          <div class="form-group">
            <Label>Név *</Label>
            <Input
              v-model="folderForm.name"
              required
              placeholder="Mappa neve"
            />
          </div>

          <div class="form-group">
            <Label>Leírás</Label>
            <Textarea
              v-model="folderForm.description"
              placeholder="Opcionális leírás"
              :rows="3"
            />
          </div>

          <div class="form-group">
            <Label>Szülő Mappa</Label>
            <select
              v-model="folderForm.parent_id"
              class="form-control"
            >
              <option :value="null">- Nincs (Gyökér szint) -</option>
              <option
                v-for="folder in folders"
                :key="folder.id"
                :value="folder.id"
                :disabled="!!(editingFolder && folder.id === editingFolder.id)"
              >
                {{ folder.name }}
              </option>
            </select>
          </div>

          <FormButtons
            :is-saving="saving"
            @cancel="closeFolderDialogs"
          />
        </form>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog
      v-model:open="showDeleteDialog"
      :title="`Biztosan törölni szeretné a '${fileToDelete?.name}' fájlt?`"
      description="Ez a művelet nem vonható vissza. A fájl véglegesen törlődik."
      confirmLabel="Törlés"
      cancelLabel="Mégse"
      variant="destructive"
      @confirm="deleteFile"
    />

    <!-- Delete Folder Confirmation Dialog -->
    <ConfirmDialog
      v-model:open="showDeleteFolderDialog"
      :title="`Biztosan törölni szeretné a '${folderToDelete?.name}' mappát?`"
      description="Ez a művelet nem vonható vissza. A mappa és a benne lévő összes fájl véglegesen törlődik."
      confirmLabel="Törlés"
      cancelLabel="Mégse"
      variant="destructive"
      @confirm="deleteFolder"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AdminLayout from '@admin/components/layout/DashboardLayout.vue'
import Icon from '@admin/components/ui/Icon.vue'
import ConfirmDialog from '@admin/components/ui/ConfirmDialog.vue'
import Input from '@admin/components/ui/Input.vue'
import Label from '@admin/components/ui/Label.vue'
import Textarea from '@admin/components/ui/Textarea.vue'
import FormButtons from '@admin/components/ui/FormButtons.vue'
import FolderTree from '../components/FolderTree.vue'
import { mediaFileService, type MediaFile } from '../services/mediaFileService'
import { mediaFolderService, type MediaFolder, type MediaFolderFormData } from '../services/mediaFolderService'

const files = ref<MediaFile[]>([])
const folders = ref<MediaFolder[]>([])
const loading = ref(false)
const foldersLoading = ref(false)
const showUploadDialog = ref(false)
const selectedFile = ref<File | null>(null)
const uploadDescription = ref('')
const uploading = ref(false)
const currentFolderId = ref<number | null>(null)
const currentFolderName = ref('')
const showDeleteDialog = ref(false)
const fileToDelete = ref<MediaFile | null>(null)
const showCreateFolderDialog = ref(false)
const showEditFolderDialog = ref(false)
const showDeleteFolderDialog = ref(false)
const editingFolder = ref<MediaFolder | null>(null)
const folderToDelete = ref<MediaFolder | null>(null)
const saving = ref(false)

const folderForm = ref<MediaFolderFormData>({
  name: '',
  description: '',
  parent_id: null,
  path: ''
})

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
  foldersLoading.value = true
  try {
    const response = await mediaFolderService.getAll()
    folders.value = response.data.data
  } catch (error) {
    console.error('Failed to load folders:', error)
  } finally {
    foldersLoading.value = false
  }
}

const navigateToFolder = async (folderId: number | null) => {
  currentFolderId.value = folderId
  if (folderId) {
    const folder = folders.value.find(f => f.id === folderId)
    currentFolderName.value = folder?.name || ''
  } else {
    currentFolderName.value = ''
  }
  loadFiles()
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

const confirmDelete = (file: MediaFile) => {
  fileToDelete.value = file
  showDeleteDialog.value = true
}

const deleteFile = async () => {
  if (!fileToDelete.value) return

  try {
    await mediaFileService.delete(fileToDelete.value.id!)
    await loadFiles()
  } catch (error) {
    console.error('Failed to delete file:', error)
    alert('Failed to delete file')
  } finally {
    fileToDelete.value = null
  }
}

const downloadFile = (file: MediaFile) => {
  const downloadUrl = file.download_url || file.url
  if (downloadUrl) {
    window.open(downloadUrl, '_blank')
  }
}

const editFolder = (folder: MediaFolder) => {
  editingFolder.value = folder
  folderForm.value = {
    name: folder.name,
    description: folder.description || '',
    parent_id: folder.parent_id || null,
    path: folder.path || ''
  }
  showEditFolderDialog.value = true
}

const confirmDeleteFolder = (folderId: number) => {
  const folder = folders.value.find(f => f.id === folderId)
  if (folder) {
    folderToDelete.value = folder
    showDeleteFolderDialog.value = true
  }
}

const deleteFolder = async () => {
  if (!folderToDelete.value) return

  try {
    await mediaFolderService.delete(folderToDelete.value.id!)
    await loadFolders()
    // If we're currently viewing the deleted folder, go to root
    if (currentFolderId.value === folderToDelete.value.id) {
      navigateToFolder(null)
    }
  } catch (error) {
    console.error('Failed to delete folder:', error)
    alert('Hiba történt a mappa törlése közben. Lehet, hogy vannak benne fájlok.')
  } finally {
    folderToDelete.value = null
  }
}

const saveFolder = async () => {
  saving.value = true
  try {
    if (showEditFolderDialog.value && editingFolder.value) {
      await mediaFolderService.update(editingFolder.value.id!, folderForm.value)
    } else {
      await mediaFolderService.create(folderForm.value)
    }
    await loadFolders()
    closeFolderDialogs()
  } catch (error) {
    console.error('Failed to save folder:', error)
    alert('Hiba történt a mappa mentése közben.')
  } finally {
    saving.value = false
  }
}

const closeFolderDialogs = () => {
  showCreateFolderDialog.value = false
  showEditFolderDialog.value = false
  editingFolder.value = null
  folderForm.value = {
    name: '',
    description: '',
    parent_id: null,
    path: ''
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
.media-container {
  display: flex;
  height: calc(100vh - 64px);
  overflow: hidden;
}

.sidebar {
  width: 280px;
  border-right: 1px solid #e5e7eb;
  background: #ffffff;
  overflow-y: auto;
  flex-shrink: 0;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-title {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.header-title h2 {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
}

.file-count {
  font-size: 14px;
  color: #6b7280;
}

.files-section {
  margin-bottom: 30px;
}

.files-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 10px;
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
