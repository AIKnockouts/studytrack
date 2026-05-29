import { ipcMain } from 'electron'
import { settingsGet, settingsSet, settingsGetAll } from '../database'

export function registerSettingsIpc(): void {
  ipcMain.handle('settings:get', (_e, key: string) => {
    try {
      return { data: settingsGet(key) }
    } catch (err) {
      return { error: String(err) }
    }
  })

  ipcMain.handle('settings:set', (_e, key: string, value: unknown) => {
    try {
      settingsSet(key, value)
      return { data: true }
    } catch (err) {
      return { error: String(err) }
    }
  })

  ipcMain.handle('settings:getAll', () => {
    try {
      return { data: settingsGetAll() }
    } catch (err) {
      return { error: String(err) }
    }
  })
}
