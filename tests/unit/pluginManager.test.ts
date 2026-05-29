import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { tmpdir } from 'os'
import { join } from 'path'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { PluginManager } from '../../src/main/plugins'
import { initializeDb, closeDb } from '../../src/main/database'

let counter = 0
let testDir: string
let pluginsDir: string

beforeEach(() => {
  testDir = join(tmpdir(), 'st-plug-' + process.pid + '-' + (++counter))
  pluginsDir = join(testDir, 'plugins')
  mkdirSync(pluginsDir, { recursive: true })
  initializeDb(testDir)
})

afterEach(() => {
  closeDb()
  rmSync(testDir, { recursive: true, force: true })
})

function makePlugin(
  root: string,
  id: string,
  manifest?: object,
  mainCode = 'module.exports = { onLoad() {}, onUnload() {} }'
): void {
  mkdirSync(join(root, id), { recursive: true })
  writeFileSync(
    join(root, id, 'plugin.json'),
    JSON.stringify(
      manifest ?? {
        id,
        name: id,
        version: '0.1.0',
        description: '',
        author: '',
        main: 'index.js',
        permissions: [],
        settings_schema: [],
      }
    )
  )
  writeFileSync(join(root, id, 'index.js'), mainCode)
}

describe('PluginManager', () => {
  it('valid plugin loads: getInstalled() returns 1 plugin, no error field', () => {
    makePlugin(pluginsDir, 'my-plugin')
    const pm = new PluginManager()
    pm.load(pluginsDir)
    const installed = pm.getInstalled()
    expect(installed).toHaveLength(1)
    expect(installed[0].error).toBeUndefined()
  })

  it('plugin dir without plugin.json: skipped (not in getInstalled OR has error)', () => {
    // Create a dir with no plugin.json
    mkdirSync(join(pluginsDir, 'no-manifest'), { recursive: true })
    const pm = new PluginManager()
    pm.load(pluginsDir)
    const installed = pm.getInstalled()
    // The implementation skips dirs without plugin.json entirely
    expect(installed).toHaveLength(0)
  })

  it('manifest missing "id" field: plugin has error, enabled=false', () => {
    makePlugin(
      pluginsDir,
      'bad-id',
      { name: 'bad-id', version: '0.1.0', description: '', author: '', main: 'index.js', permissions: [], settings_schema: [] }
    )
    const pm = new PluginManager()
    pm.load(pluginsDir)
    const installed = pm.getInstalled()
    expect(installed).toHaveLength(1)
    expect(installed[0].error).toBeDefined()
    expect(installed[0].enabled).toBe(false)
  })

  it('manifest missing "name" field: plugin has error', () => {
    makePlugin(
      pluginsDir,
      'bad-name',
      { id: 'bad-name', version: '0.1.0', description: '', author: '', main: 'index.js', permissions: [], settings_schema: [] }
    )
    const pm = new PluginManager()
    pm.load(pluginsDir)
    const installed = pm.getInstalled()
    expect(installed).toHaveLength(1)
    expect(installed[0].error).toBeDefined()
  })

  it('manifest malformed JSON: plugin has error, app does not crash', () => {
    mkdirSync(join(pluginsDir, 'bad-json'), { recursive: true })
    writeFileSync(join(pluginsDir, 'bad-json', 'plugin.json'), '{ not valid json !!!')
    writeFileSync(join(pluginsDir, 'bad-json', 'index.js'), 'module.exports = {}')
    const pm = new PluginManager()
    expect(() => pm.load(pluginsDir)).not.toThrow()
    const installed = pm.getInstalled()
    expect(installed).toHaveLength(1)
    expect(installed[0].error).toBeDefined()
    expect(installed[0].enabled).toBe(false)
  })

  it('plugin index.js throws on load: that plugin has error; manager still loads other plugins', () => {
    makePlugin(pluginsDir, 'bad-load', undefined, 'throw new Error("crash on load")')
    makePlugin(pluginsDir, 'good-plugin')
    const pm = new PluginManager()
    pm.load(pluginsDir)
    const installed = pm.getInstalled()
    expect(installed).toHaveLength(2)
    const bad = installed.find((p) => p.manifest.id === 'bad-load')
    const good = installed.find((p) => p.manifest.id === 'good-plugin')
    expect(bad).toBeDefined()
    expect(bad!.error).toBeDefined()
    expect(good).toBeDefined()
    expect(good!.error).toBeUndefined()
  })

  it('plugin without read:sessions permission calls api.sessions.getAll: throws/rejects with permission message', async () => {
    // api.sessions.getAll() throws synchronously (before returning a Promise) when permission is missing.
    // The plugin wraps the call in try/catch to record the error into storage.
    makePlugin(
      pluginsDir,
      'no-perm',
      { id: 'no-perm', name: 'no-perm', version: '0.1.0', description: '', author: '', main: 'index.js', permissions: [], settings_schema: [] },
      `
      module.exports = {
        onLoad() {
          try {
            api.sessions.getAll()
            api.storage.set('result', 'resolved')
          } catch(err) {
            api.storage.set('result', err.message)
          }
        }
      }
      `
    )
    const pm = new PluginManager()
    pm.load(pluginsDir)
    await new Promise((r) => setTimeout(r, 20))
    const installed = pm.getInstalled()
    expect(installed).toHaveLength(1)
    const { pluginStorageGet } = await import('../../src/main/database')
    const result = pluginStorageGet('no-perm', 'result') as string | undefined
    expect(result).toBeDefined()
    expect(result).toMatch(/permission/i)
  })

  it('plugin with read:sessions permission calls api.sessions.getAll: resolves with array', async () => {
    makePlugin(
      pluginsDir,
      'has-perm',
      { id: 'has-perm', name: 'has-perm', version: '0.1.0', description: '', author: '', main: 'index.js', permissions: ['read:sessions'], settings_schema: [] },
      `
      module.exports = {
        onLoad() {
          api.sessions.getAll().then(
            (result) => { api.storage.set('isArray', Array.isArray(result) ? 'yes' : 'no') },
            (err) => { api.storage.set('isArray', 'error: ' + err.message) }
          )
        }
      }
      `
    )
    const pm = new PluginManager()
    pm.load(pluginsDir)
    await new Promise((r) => setTimeout(r, 20))
    const installed = pm.getInstalled()
    expect(installed[0].error).toBeUndefined()
    const { pluginStorageGet } = await import('../../src/main/database')
    const result = pluginStorageGet('has-perm', 'isArray')
    expect(result).toBe('yes')
  })

  it('plugin storage isolation: pluginA sets key, pluginB getting key → undefined', async () => {
    makePlugin(
      pluginsDir,
      'plugin-a',
      { id: 'plugin-a', name: 'plugin-a', version: '0.1.0', description: '', author: '', main: 'index.js', permissions: [], settings_schema: [] },
      `module.exports = { onLoad() { api.storage.set('shared-key', 'val-from-a') } }`
    )
    makePlugin(
      pluginsDir,
      'plugin-b',
      { id: 'plugin-b', name: 'plugin-b', version: '0.1.0', description: '', author: '', main: 'index.js', permissions: [], settings_schema: [] },
      `
      module.exports = {
        onLoad() {
          api.storage.get('shared-key').then(v => {
            // store whether it was undefined or not, using a flag key
            api.storage.set('saw-key', v === undefined ? 'undefined' : 'defined')
          })
        }
      }
      `
    )
    const pm = new PluginManager()
    pm.load(pluginsDir)
    await new Promise((r) => setTimeout(r, 20))
    const { pluginStorageGet } = await import('../../src/main/database')
    // plugin-b should not see plugin-a's storage
    const sawKey = pluginStorageGet('plugin-b', 'saw-key')
    expect(sawKey).toBe('undefined')
  })

  it('pluginA sets key, pluginA gets key → "val"', async () => {
    makePlugin(
      pluginsDir,
      'plugin-self',
      { id: 'plugin-self', name: 'plugin-self', version: '0.1.0', description: '', author: '', main: 'index.js', permissions: [], settings_schema: [] },
      `
      module.exports = {
        onLoad() {
          api.storage.set('mykey', 'myval').then(() => {
            api.storage.get('mykey').then(v => {
              api.storage.set('retrieved', v)
            })
          })
        }
      }
      `
    )
    const pm = new PluginManager()
    pm.load(pluginsDir)
    await new Promise((r) => setTimeout(r, 20))
    const { pluginStorageGet } = await import('../../src/main/database')
    const retrieved = pluginStorageGet('plugin-self', 'retrieved')
    expect(retrieved).toBe('myval')
  })

  it('emit "app:ready": handler registered via api.on() fires', async () => {
    // Use storage to track whether the event handler fired
    makePlugin(
      pluginsDir,
      'event-plugin',
      { id: 'event-plugin', name: 'event-plugin', version: '0.1.0', description: '', author: '', main: 'index.js', permissions: [], settings_schema: [] },
      `
      module.exports = {
        onLoad() {
          api.on('app:ready', () => { api.storage.set('fired', 'yes') })
        }
      }
      `
    )
    const pm = new PluginManager()
    pm.load(pluginsDir)
    pm.emit('app:ready')
    // storage.set is synchronous inside the plugin (it calls pluginStorageSet directly)
    const { pluginStorageGet } = await import('../../src/main/database')
    const fired = pluginStorageGet('event-plugin', 'fired')
    expect(fired).toBe('yes')
  })

  it('emit: handler that throws → no crash, other handlers still fire', async () => {
    // Use storage as signal carrier for the second handler
    makePlugin(
      pluginsDir,
      'throws-plugin',
      { id: 'throws-plugin', name: 'throws-plugin', version: '0.1.0', description: '', author: '', main: 'index.js', permissions: [], settings_schema: [] },
      `
      module.exports = {
        onLoad() {
          api.on('app:ready', () => { throw new Error('handler crash') })
          api.on('app:ready', () => { api.storage.set('second', 'fired') })
        }
      }
      `
    )
    const pm = new PluginManager()
    pm.load(pluginsDir)
    expect(() => pm.emit('app:ready')).not.toThrow()
    const { pluginStorageGet } = await import('../../src/main/database')
    const second = pluginStorageGet('throws-plugin', 'second')
    expect(second).toBe('fired')
  })
})
