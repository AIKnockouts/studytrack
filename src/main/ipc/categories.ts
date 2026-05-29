import { ipcMain } from 'electron'
import {
  categoriesGetAll,
  categoriesCreate,
  categoriesUpdate,
  categoriesArchive,
  categoriesReorder,
} from '../database'

export function registerCategoriesIpc(): void {
  ipcMain.handle('categories:getAll', () => {
    try {
      return { data: categoriesGetAll() }
    } catch (err) {
      return { error: String(err) }
    }
  })

  ipcMain.handle('categories:create', (_e, data: { name: string; color: string; emoji?: string }) => {
    try {
      return { data: categoriesCreate(data) }
    } catch (err) {
      return { error: String(err) }
    }
  })

  ipcMain.handle(
    'categories:update',
    (_e, id: string, updates: { name?: string; color?: string; emoji?: string | null }) => {
      try {
        return { data: categoriesUpdate(id, updates) }
      } catch (err) {
        return { error: String(err) }
      }
    }
  )

  ipcMain.handle('categories:archive', (_e, id: string) => {
    try {
      categoriesArchive(id)
      return { data: true }
    } catch (err) {
      return { error: String(err) }
    }
  })

  ipcMain.handle('categories:reorder', (_e, orderedIds: string[]) => {
    try {
      categoriesReorder(orderedIds)
      return { data: true }
    } catch (err) {
      return { error: String(err) }
    }
  })
}
