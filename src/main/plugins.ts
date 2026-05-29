import { existsSync, readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import vm from 'vm'
import type { PluginManifest, LoadedPlugin } from '../shared/types'
import {
  sessionsGetAll,
  sessionsGetByDate,
  categoriesGetAll,
  pluginGetEnabled,
  pluginStorageGet,
  pluginStorageSet,
} from './database'

const REQUIRED_MANIFEST_FIELDS = ['id', 'name', 'version', 'main'] as const

type EventName = 'session:completed' | 'session:started' | 'app:ready'
type EventHandler = (...args: unknown[]) => void

export class PluginManager {
  private plugins: LoadedPlugin[] = []
  private eventHandlers = new Map<string, EventHandler[]>()
  private notifyFn: ((msg: string, type: string) => void) | null = null

  setNotifyFn(fn: (msg: string, type: string) => void): void {
    this.notifyFn = fn
  }

  load(pluginsDir: string): void {
    if (!existsSync(pluginsDir)) return

    const enabledMap = pluginGetEnabled()

    for (const entry of readdirSync(pluginsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const pluginDir = join(pluginsDir, entry.name)
      const manifestPath = join(pluginDir, 'plugin.json')

      if (!existsSync(manifestPath)) continue

      let manifest: PluginManifest | null = null
      try {
        manifest = this.parseManifest(manifestPath)
      } catch (err) {
        this.plugins.push({
          manifest: { id: entry.name, name: entry.name, version: '?', description: '', author: '', main: '', permissions: [], settings_schema: [] },
          enabled: false,
          path: pluginDir,
          error: `Invalid manifest: ${String(err)}`,
        })
        continue
      }

      const enabled = enabledMap[manifest.id] !== false // default enabled

      if (!enabled) {
        this.plugins.push({ manifest, enabled: false, path: pluginDir })
        continue
      }

      const loadedPlugin: LoadedPlugin = { manifest, enabled, path: pluginDir }
      try {
        this.loadPlugin(loadedPlugin)
      } catch (err) {
        loadedPlugin.error = `Load error: ${String(err)}`
        loadedPlugin.enabled = false
      }
      this.plugins.push(loadedPlugin)
    }
  }

  private parseManifest(manifestPath: string): PluginManifest {
    const raw = JSON.parse(readFileSync(manifestPath, 'utf8'))
    for (const field of REQUIRED_MANIFEST_FIELDS) {
      if (!raw[field]) throw new Error(`Missing required field: ${field}`)
    }
    return {
      id: String(raw.id),
      name: String(raw.name),
      version: String(raw.version),
      description: String(raw.description ?? ''),
      author: String(raw.author ?? ''),
      main: String(raw.main),
      permissions: Array.isArray(raw.permissions) ? raw.permissions : [],
      settings_schema: Array.isArray(raw.settings_schema) ? raw.settings_schema : [],
    }
  }

  private loadPlugin(plugin: LoadedPlugin): void {
    const { manifest, path: pluginDir } = plugin
    const mainPath = join(pluginDir, manifest.main)
    if (!existsSync(mainPath)) {
      plugin.error = `Entry file not found: ${manifest.main}`
      return
    }

    const code = readFileSync(mainPath, 'utf8')
    const api = this.buildApi(manifest.id, manifest.permissions)

    const sandbox = {
      require: (mod: string) => {
        // Only allow safe built-in modules
        if (['path', 'os'].includes(mod)) return require(mod)
        throw new Error(`Plugin cannot require "${mod}"`)
      },
      module: { exports: {} as Record<string, unknown> },
      exports: {} as Record<string, unknown>,
      console,
      api,
    }
    sandbox.exports = sandbox.module.exports

    vm.runInNewContext(`(function(module, exports, require, api, console) { ${code} })(module, exports, require, api, console)`, sandbox)

    const pluginExports = sandbox.module.exports as { onLoad?: () => void; onUnload?: () => void }
    if (typeof pluginExports.onLoad === 'function') {
      pluginExports.onLoad()
    }
  }

  private buildApi(pluginId: string, permissions: string[]): object {
    const hasPermission = (p: string) => permissions.includes(p)

    return {
      sessions: {
        getAll: (filter?: Parameters<typeof sessionsGetAll>[0]) => {
          if (!hasPermission('read:sessions')) throw new Error('Missing permission: read:sessions')
          return Promise.resolve(sessionsGetAll(filter))
        },
        getByDay: (date: string) => {
          if (!hasPermission('read:sessions')) throw new Error('Missing permission: read:sessions')
          return Promise.resolve(sessionsGetByDate(date))
        },
      },
      categories: {
        getAll: () => {
          if (!hasPermission('read:categories')) throw new Error('Missing permission: read:categories')
          return Promise.resolve(categoriesGetAll())
        },
      },
      on: (event: EventName, handler: EventHandler) => {
        const key = `${pluginId}:${event}`
        const handlers = this.eventHandlers.get(key) ?? []
        handlers.push(handler)
        this.eventHandlers.set(key, handlers)
      },
      storage: {
        get: (key: string) => Promise.resolve(pluginStorageGet(pluginId, key)),
        set: (key: string, value: unknown) => {
          pluginStorageSet(pluginId, key, value)
          return Promise.resolve()
        },
      },
      ui: {
        showNotification: (message: string, type = 'info') => {
          this.notifyFn?.(message, type)
        },
      },
    }
  }

  emit(event: EventName, ...args: unknown[]): void {
    for (const plugin of this.plugins) {
      if (!plugin.enabled || plugin.error) continue
      const key = `${plugin.manifest.id}:${event}`
      const handlers = this.eventHandlers.get(key) ?? []
      for (const handler of handlers) {
        try {
          handler(...args)
        } catch {
          // Plugin errors must never affect the core app
        }
      }
    }
  }

  getInstalled(): LoadedPlugin[] {
    return this.plugins
  }
}

export const pluginManager = new PluginManager()
