import { MenuBuilder, type MenuItemConfig } from '@menu/types/menu'
import { FolderOpen, Image, Folders } from 'lucide-vue-next'

/**
 * Media Menu Builder
 * Builds the media management menu structure
 */
export class MediaMenuBuilder extends MenuBuilder {
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
    }

    this.addMenuItem(menu, mediaItem)

    return menu
  }
}

// Export singleton instance
export const mediaMenuBuilder = new MediaMenuBuilder()
