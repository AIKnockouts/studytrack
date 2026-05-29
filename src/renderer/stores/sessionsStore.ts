import { create } from 'zustand'
import type { Session, SessionFilter } from '../../shared/types'

interface SessionsState {
  sessions: Session[]
  isLoading: boolean
  load: (filter?: SessionFilter) => Promise<void>
  deleteSession: (id: string) => Promise<void>
  updateNote: (id: string, note: string | null) => Promise<void>
}

export const useSessionsStore = create<SessionsState>((set, get) => ({
  sessions: [],
  isLoading: false,

  load: async (filter?: SessionFilter) => {
    set({ isLoading: true })
    const response = await window.api.sessions.getAll(filter)
    set({ sessions: response.data ?? [], isLoading: false })
  },

  deleteSession: async (id: string) => {
    await window.api.sessions.delete(id)
    set({ sessions: get().sessions.filter((s) => s.id !== id) })
  },

  updateNote: async (id: string, note: string | null) => {
    await window.api.sessions.updateNote(id, note)
    set({
      sessions: get().sessions.map((s) =>
        s.id === id ? { ...s, note } : s
      ),
    })
  },
}))
