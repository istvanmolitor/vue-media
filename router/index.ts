import type { RouteRecordRaw } from 'vue-router'
import MediaFileList from '../views/MediaFileList.vue'
import MediaFolderList from '../views/MediaFolderList.vue'

export const mediaRoutes: RouteRecordRaw[] = [
  {
    path: '/media',
    name: 'media',
    component: MediaFileList,
    meta: {
      title: 'Media Files',
      requiresAuth: true,
    },
  },
  {
    path: '/media/folders',
    name: 'media-folders',
    component: MediaFolderList,
    meta: {
      title: 'Media Folders',
      requiresAuth: true,
    },
  },
]

export default mediaRoutes
