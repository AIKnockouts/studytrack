import { ipcMain } from 'electron'
import { pluginSetEnabled } from '../database'
import type { PluginManager } from '../plugins'

export function registerPluginsIpc(pluginManager: PluginManager): void {
  ipcMain.handle('plugins:getInstalled', () => {
    try {
      return { data: pluginManager.getInstalled() }
    } catch (err) {
      return { error: String(err) }
    }
  })

  ipcMain.handle('plugins:enable', (_e, id: string) => {
    try {
      pluginSetEnabled(id, true)
      return { data: true }
    } catch (err) {
      return { error: String(err) }
    }
  })

  ipcMain.handle('plugins:disable', (_e, id: string) => {
    try {
      pluginSetEnabled(id, false)
      return { data: true }
    } catch (err) {
      return { error: String(err) }
    }
  })
}
