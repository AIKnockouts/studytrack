import { create } from 'zustand'
import { Category } from '../../shared/types'

interface CategoriesStore {
  categories: Category[]
  load: () => Promise<void>
  createCategory: (data: { name: string; color: string; emoji?: string }) => Promise<void>
  updateCategory: (
    id: string,
    updates: { name?: string; color?: string; emoji?: string | null }
  ) => Promise<void>
  archiveCategory: (id: string) => Promise<void>
  reorderCategories: (orderedIds: string[]) => Promise<void>
  getActive: () => Category[]
  getArchived: () => Category[]
}

export const useCategoriesStore = create<CategoriesStore>((set, get) => ({
  categories: [],

  load: async () => {
    try {
      const response = await window.api.categories.getAll()
      if (response.data) {
        set({ categories: response.data })
      }
    } catch {
      // handle gracefully — leave categories as-is
    }
  },

  createCategory: async (data) => {
    const response = await window.api.categories.create(data)
    if (response.error) throw new Error(response.error)
    if (response.data) {
      set((state) => ({ categories: [...state.categories, response.data!] }))
    }
  },

  updateCategory: async (id, updates) => {
    const response = await window.api.categories.update(id, updates)
    if (response.error) throw new Error(response.error)
    if (response.data) {
      set((state) => ({
        categories: state.categories.map((c) => (c.id === id ? response.data! : c)),
      }))
    }
  },

  archiveCategory: async (id) => {
    const response = await window.api.categories.archive(id)
    if (response.error) throw new Error(response.error)
    if (response.data) {
      const now = Date.now()
      set((state) => ({
        categories: state.categories.map((c) =>
          c.id === id ? { ...c, archived_at: now } : c
        ),
      }))
    }
  },

  reorderCategories: async (orderedIds) => {
    const response = await window.api.categories.reorder(orderedIds)
    if (response.error) throw new Error(response.error)
    // Re-sort state to match new order
    set((state) => {
      const orderMap = new Map(orderedIds.map((id, idx) => [id, idx]))
      const reordered = [...state.categories].sort((a, b) => {
        const ai = orderMap.has(a.id) ? orderMap.get(a.id)! : Infinity
        const bi = orderMap.has(b.id) ? orderMap.get(b.id)! : Infinity
        return ai - bi
      })
      return {
        categories: reordered.map((c, idx) =>
          orderMap.has(c.id) ? { ...c, sort_order: idx } : c
        ),
      }
    })
  },

  getActive: () => {
    return get()
      .categories.filter((c) => c.archived_at === null)
      .sort((a, b) => a.sort_order - b.sort_order)
  },

  getArchived: () => {
    return get().categories.filter((c) => c.archived_at !== null)
  },
}))
