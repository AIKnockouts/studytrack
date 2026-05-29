import { create } from 'zustand'
import { Settings, DEFAULT_SETTINGS } from '../../shared/types'

interface SettingsStore extends Settings {
  load: () => Promise<void>
  setSetting: (key: keyof Settings, value: unknown) => Promise<void>
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  ...DEFAULT_SETTINGS,

  load: async () => {
    try {
      const response = await window.api.settings.getAll()
      if (response.data) {
        const merged: Settings = { ...DEFAULT_SETTINGS }
        const raw = response.data as Record<string, unknown>
        for (const key of Object.keys(DEFAULT_SETTINGS) as Array<keyof Settings>) {
          if (raw[key] !== undefined && raw[key] !== null) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(merged as any)[key] = raw[key]
          }
        }
        set(merged)
      }
    } catch (e) {
      console.error('[settingsStore] load error:', e)
    }
  },

  setSetting: async (key: keyof Settings, value: unknown) => {
    await window.api.settings.set(key, value)
    set((state) => ({ ...state, [key]: value }))
  },
}))
