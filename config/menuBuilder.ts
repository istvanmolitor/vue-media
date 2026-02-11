import type { MenuBuilder, MenuItemConfig } from '@menu/index'
import { FolderOpen, Image, Folders } from 'lucide-vue-next'

/**
 * Media Menu Builder
 * Builds the media management menu structure
 */
export class MediaMenuBuilder implements MenuBuilder {
  build(menu: MenuItemConfig, menuName: string): MenuItemConfig {
    // Only add to admin menu
    if (menuName !== 'admin') {
      return menu
    }

    return this.buildAdminMenu(menu)
  }

  /**
   * Build admin menu items
   */
  private buildAdminMenu(menu: MenuItemConfig): MenuItemConfig {
    // Add media management menu item
    const mediaItem: MenuItemConfig = {
      id: 'media-management',
      title: 'Média',
      path: '/media',
      icon: FolderOpen,
      order: 50,
      children: [
        {
          id: 'media-files',
          title: 'Fájlok',
          path: '/media',
          icon: Image,
          order: 10
        },
        {
          id: 'media-folders',
          title: 'Mappák',
          path: '/media/folders',
          icon: Folders,
          order: 20
        }
      ]
    }

    // Add to menu children
    if (!menu.children) {
      menu.children = []
    }
    menu.children.push(mediaItem)

    // Sort children by order
    menu.children.sort((a, b) => {
      const orderA = a.order ?? Number.MAX_SAFE_INTEGER
      const orderB = b.order ?? Number.MAX_SAFE_INTEGER
      return orderA - orderB
    })

    return menu
  }
}

// Export singleton instance
export const mediaMenuBuilder = new MediaMenuBuilder()
