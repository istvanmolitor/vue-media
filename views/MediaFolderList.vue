<template>
  <AdminLayout>
    <div class="media-folders-container">
      <div class="header">
        <h2 class="text-3xl font-bold tracking-tight">Média Mappák</h2>
        <div class="actions">
          <Button @click="showCreateDialog = true">
            <Icon name="plus" :size="16" class="mr-2" />
            Új Mappa
          </Button>
        </div>
      </div>

      <!-- Folders Table -->
      <DataTable
        :columns="columns"
        :data="folders"
        :loading="isLoading"
        :searchable="true"
        search-placeholder="Keresés név alapján..."
        default-sort="name"
        default-direction="asc"
        @fetch="fetchFolders"
      >
        <template #cell-parent="{ row }">
          <span v-if="row.parent">{{ row.parent.name }}</span>
          <span v-else class="text-gray-400">-</span>
        </template>

        <template #row-actions="{ row }">
          <div class="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" @click="editFolder(row)">Szerkesztés</Button>
            <Button variant="destructive" size="sm" @click="deleteFolder(row.id!)">Törlés</Button>
          </div>
        </template>

        <template #empty>
          Nincs megjeleníthető mappa.
        </template>
      </DataTable>

      <!-- Create/Edit Dialog -->
      <div v-if="showCreateDialog || showEditDialog" class="modal-overlay" @click="closeDialogs">
        <div class="modal-content" @click.stop>
          <h3 class="text-2xl font-bold mb-6">{{ showEditDialog ? 'Mappa Szerkesztése' : 'Új Mappa' }}</h3>
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
                  v-for="folder in availableFolders"
                  :key="folder.id"
                  :value="folder.id"
                  :disabled="!!(editingFolder && folder.id === editingFolder.id)"
                >
                  {{ folder.name }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <Label>Útvonal</Label>
              <Input
                v-model="folderForm.path"
                placeholder="Opcionális útvonal"
              />
            </div>

            <FormButtons
              :is-saving="saving"
              @cancel="closeDialogs"
            />
          </form>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import AdminLayout from '@admin/components/layout/DashboardLayout.vue'
import Button from '@admin/components/ui/Button.vue'
import Icon from '@admin/components/ui/Icon.vue'
import Input from '@admin/components/ui/Input.vue'
import Label from '@admin/components/ui/Label.vue'
import Textarea from '@admin/components/ui/Textarea.vue'
import FormButtons from '@admin/components/ui/FormButtons.vue'
import DataTable, { type Column } from '@admin/components/DataTable.vue'
import { mediaFolderService, type MediaFolder, type MediaFolderFormData } from '../services/mediaFolderService'

const folders = ref<MediaFolder[]>([])
const isLoading = ref(false)
const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const saving = ref(false)
const editingFolder = ref<MediaFolder | null>(null)

const folderForm = ref<MediaFolderFormData>({
  name: '',
  description: '',
  parent_id: null,
  path: ''
})

const columns: Column<MediaFolder>[] = [
  { key: 'id', label: 'ID', sortable: true, width: '80px' },
  { key: 'name', label: 'Név', sortable: true },
  { key: 'description', label: 'Leírás', sortable: false },
  { key: 'parent', label: 'Szülő Mappa', sortable: false, width: '200px' },
  { key: 'path', label: 'Útvonal', sortable: false },
]

const availableFolders = computed(() => {
  return folders.value.filter(f => {
    // Ha szerkesztés közben vagyunk, ne jelenjen meg a saját mappa
    return !(editingFolder.value && f.id === editingFolder.value.id)
  })
})

const fetchFolders = async () => {
  try {
    isLoading.value = true
    const response = await mediaFolderService.getAll()
    folders.value = response.data.data
  } catch (error) {
    console.error('Hiba a mappák betöltésekor:', error)
  } finally {
    isLoading.value = false
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
  showEditDialog.value = true
}

const deleteFolder = async (id: number) => {
  if (!confirm('Biztosan törölni szeretné ezt a mappát? A benne lévő fájlok is törlődnek!')) return

  try {
    await mediaFolderService.delete(id)
    await fetchFolders()
  } catch (error) {
    console.error('Hiba a mappa törlésekor:', error)
    alert('Hiba történt a mappa törlése közben. Lehet, hogy vannak benne fájlok.')
  }
}

const saveFolder = async () => {
  saving.value = true
  try {
    if (showEditDialog.value && editingFolder.value) {
      await mediaFolderService.update(editingFolder.value.id!, folderForm.value)
    } else {
      await mediaFolderService.create(folderForm.value)
    }
    await fetchFolders()
    closeDialogs()
  } catch (error) {
    console.error('Hiba a mappa mentésekor:', error)
    alert('Hiba történt a mappa mentése közben.')
  } finally {
    saving.value = false
  }
}

const closeDialogs = () => {
  showCreateDialog.value = false
  showEditDialog.value = false
  editingFolder.value = null
  folderForm.value = {
    name: '',
    description: '',
    parent_id: null,
    path: ''
  }
}

onMounted(() => {
  fetchFolders()
})
</script>

<style scoped>
.media-folders-container {
  max-width: 1400px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.form-group {
  margin-bottom: 16px;
}

.form-control {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
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
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}
</style>
