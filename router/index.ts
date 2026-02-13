import type { RouteRecordRaw } from 'vue-router'
import MediaFileList from '../views/MediaFileList.vue'

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
]

export default mediaRoutes
