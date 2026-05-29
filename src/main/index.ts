import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { initializeDb, settingsGet } from './database'
import { registerSessionsIpc } from './ipc/sessions'
import { registerCategoriesIpc } from './ipc/categories'
import { registerSettingsIpc } from './ipc/settings'
import { registerPluginsIpc } from './ipc/plugins'
import { pluginManager } from './plugins'

function getDataDir(): string {
  const stored = settingsGet('data_dir') as string | undefined
  if (stored && stored.trim()) return stored
  const base = app.getPath('userData')
  return join(base, app.isPackaged ? 'studytrack' : 'studytrack-dev')
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1100,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    title: 'StudyTrack',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // Init DB — needs to happen before IPC handlers are called
  let dataDir: string
  try {
    // Settings may not exist yet; use default path
    dataDir = join(app.getPath('userData'), app.isPackaged ? 'studytrack' : 'studytrack-dev')
  } catch {
    dataDir = join(app.getPath('home'), '.studytrack')
  }
  initializeDb(dataDir)

  // Re-check if user has a custom data_dir setting
  const customDir = settingsGet('data_dir') as string | undefined
  if (customDir && customDir.trim()) {
    // For simplicity in v1, we just note it — re-init would require app restart
  }

  // Register all IPC handlers
  registerSessionsIpc()
  registerCategoriesIpc()
  registerSettingsIpc()
  registerPluginsIpc(pluginManager)

  // Plugin infrastructure
  const pluginsDir = join(dataDir, 'plugins')
  pluginManager.setNotifyFn((msg, type) => {
    // Forward to renderer if needed — for now just log
    console.log(`[plugin notification] [${type}] ${msg}`)
  })
  pluginManager.load(pluginsDir)
  pluginManager.emit('app:ready')

  // App IPC
  ipcMain.handle('app:getDataDir', () => ({ data: dataDir }))
  ipcMain.handle('app:openDataDir', () => {
    shell.openPath(dataDir)
    return { data: true }
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
