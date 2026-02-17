import { createApiClient } from '@user/services/apiClient'

const api = createApiClient()

export interface MediaFolder {
  id?: number
  name: string
  description?: string | null
  parent_id?: number | null
  path?: string | null
  parent?: MediaFolder
  children?: MediaFolder[]
  files?: MediaFile[]
  created_at?: string
  updated_at?: string
}

export interface MediaFile {
  id?: number
  name: string
  filename: string
  path: string
  url?: string
  mime_type: string
  size: number
  folder_id?: number | null
  folder?: MediaFolder
  user_id?: number | null
  description?: string | null
  created_at?: string
  updated_at?: string
}

export interface MediaFolderFormData {
  name: string
  description?: string
  parent_id?: number | null
  path?: string
}

export interface MediaFileFormData {
  name?: string
  folder_id?: number | null
  description?: string
}

export interface SingleResponse<T> {
  data: T
}

export interface ListResponse<T> {
  data: T[]
}

export const mediaFolderService = {
  getAll(params?: { parent_id?: number }) {
    return api.get<ListResponse<MediaFolder>>('/api/media/folders', { params })
  },
  getById(id: number | string) {
    return api.get<SingleResponse<MediaFolder>>(`/api/media/folders/${id}`)
  },
  create(data: MediaFolderFormData) {
    return api.post<SingleResponse<MediaFolder>>('/api/media/folders', data)
  },
  update(id: number | string, data: MediaFolderFormData) {
    return api.put<SingleResponse<MediaFolder>>(`/api/media/folders/${id}`, data)
  },
  delete(id: number | string) {
    return api.delete(`/api/media/folders/${id}`)
  },
}
