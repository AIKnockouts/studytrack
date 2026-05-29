import { ipcMain } from 'electron'
import {
  sessionsGetAll,
  sessionsGetByDate,
  sessionsCreate,
  sessionsUpdateNote,
  sessionsDelete,
} from '../database'
import type { SessionFilter } from '../../shared/types'

export function registerSessionsIpc(): void {
  ipcMain.handle('sessions:getAll', (_e, filter?: SessionFilter) => {
    try {
      return { data: sessionsGetAll(filter) }
    } catch (err) {
      return { error: String(err) }
    }
  })

  ipcMain.handle('sessions:getByDate', (_e, date: string) => {
    try {
      return { data: sessionsGetByDate(date) }
    } catch (err) {
      return { error: String(err) }
    }
  })

  ipcMain.handle('sessions:create', (_e, data) => {
    try {
      return { data: sessionsCreate(data) }
    } catch (err) {
      return { error: String(err) }
    }
  })

  ipcMain.handle('sessions:updateNote', (_e, id: string, note: string | null) => {
    try {
      sessionsUpdateNote(id, note)
      return { data: true }
    } catch (err) {
      return { error: String(err) }
    }
  })

  ipcMain.handle('sessions:delete', (_e, id: string) => {
    try {
      sessionsDelete(id)
      return { data: true }
    } catch (err) {
      return { error: String(err) }
    }
  })
}
