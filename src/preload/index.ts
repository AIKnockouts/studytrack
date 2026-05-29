import { contextBridge, ipcRenderer } from 'electron'
import type { Session, Category, SessionFilter, LoadedPlugin, IpcResponse } from '../shared/types'

type Api = {
  sessions: {
    getAll(filter?: SessionFilter): Promise<IpcResponse<Session[]>>
    getByDate(date: string): Promise<IpcResponse<Session[]>>
    create(data: Omit<Session, 'id' | 'created_at'>): Promise<IpcResponse<Session>>
    updateNote(id: string, note: string | null): Promise<IpcResponse<boolean>>
    delete(id: string): Promise<IpcResponse<boolean>>
  }
  categories: {
    getAll(): Promise<IpcResponse<Category[]>>
    create(data: { name: string; color: string; emoji?: string }): Promise<IpcResponse<Category>>
    update(id: string, updates: { name?: string; color?: string; emoji?: string | null }): Promise<IpcResponse<Category>>
    archive(id: string): Promise<IpcResponse<boolean>>
    reorder(orderedIds: string[]): Promise<IpcResponse<boolean>>
  }
  settings: {
    get(key: string): Promise<IpcResponse<unknown>>
    set(key: string, value: unknown): Promise<IpcResponse<boolean>>
    getAll(): Promise<IpcResponse<Record<string, unknown>>>
  }
  plugins: {
    getInstalled(): Promise<IpcResponse<LoadedPlugin[]>>
    enable(id: string): Promise<IpcResponse<boolean>>
    disable(id: string): Promise<IpcResponse<boolean>>
  }
  app: {
    getDataDir(): Promise<IpcResponse<string>>
    openDataDir(): Promise<IpcResponse<boolean>>
  }
}

const api: Api = {
  sessions: {
    getAll: (filter) => ipcRenderer.invoke('sessions:getAll', filter),
    getByDate: (date) => ipcRenderer.invoke('sessions:getByDate', date),
    create: (data) => ipcRenderer.invoke('sessions:create', data),
    updateNote: (id, note) => ipcRenderer.invoke('sessions:updateNote', id, note),
    delete: (id) => ipcRenderer.invoke('sessions:delete', id),
  },
  categories: {
    getAll: () => ipcRenderer.invoke('categories:getAll'),
    create: (data) => ipcRenderer.invoke('categories:create', data),
    update: (id, updates) => ipcRenderer.invoke('categories:update', id, updates),
    archive: (id) => ipcRenderer.invoke('categories:archive', id),
    reorder: (orderedIds) => ipcRenderer.invoke('categories:reorder', orderedIds),
  },
  settings: {
    get: (key) => ipcRenderer.invoke('settings:get', key),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:getAll'),
  },
  plugins: {
    getInstalled: () => ipcRenderer.invoke('plugins:getInstalled'),
    enable: (id) => ipcRenderer.invoke('plugins:enable', id),
    disable: (id) => ipcRenderer.invoke('plugins:disable', id),
  },
  app: {
    getDataDir: () => ipcRenderer.invoke('app:getDataDir'),
    openDataDir: () => ipcRenderer.invoke('app:openDataDir'),
  },
}

contextBridge.exposeInMainWorld('api', api)

declare global {
  interface Window {
    api: Api
  }
}
