import axios from 'axios'
import config from '@config'

const api = axios.create({
  baseURL: config.SERVER_URL,
  headers: {
    'Accept': 'application/json',
  },
})

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

export interface MediaFile {
  id?: number
  name: string
  filename: string
  path: string
  url?: string
  download_url?: string
  mime_type: string
  size: number
  folder_id?: number | null
  user_id?: number | null
  description?: string | null
  created_at?: string
  updated_at?: string
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

export const mediaFileService = {
  getAll(params?: { folder_id?: number }) {
    return api.get<ListResponse<MediaFile>>('/api/media/files', { params })
  },
  getById(id: number | string) {
    return api.get<SingleResponse<MediaFile>>(`/api/media/files/${id}`)
  },
  upload(file: File, folderId?: number | null, description?: string) {
    const formData = new FormData()
    formData.append('file', file)
    if (folderId) {
      formData.append('folder_id', folderId.toString())
    }
    if (description) {
      formData.append('description', description)
    }

    return api.post<SingleResponse<MediaFile>>('/api/media/files', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
  update(id: number | string, data: MediaFileFormData) {
    return api.put<SingleResponse<MediaFile>>(`/api/media/files/${id}`, data)
  },
  delete(id: number | string) {
    return api.delete(`/api/media/files/${id}`)
  },
}
