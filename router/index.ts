import type { RouteRecordRaw } from 'vue-router'
import MediaFileList from '../views/MediaFileList.vue'

export const mediaRoutes: RouteRecordRaw[] = [
  {
    path: '/admin/media',
    name: 'media',
    component: MediaFileList,
    meta: {
      title: 'Media Files',
      requiresAuth: true,
      noPadding: true,
    },
  },
]

export default mediaRoutes
