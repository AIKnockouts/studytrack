import React, { useEffect, useState, useRef } from 'react'
import { useCategoriesStore } from '../../stores/categoriesStore'
import { Category } from '../../../shared/types'

// ---------------------------------------------------------------------------
// Inline Edit Form
// ---------------------------------------------------------------------------
interface EditFormProps {
  category: Category
  allActive: Category[]
  onSave: () => void
  onCancel: () => void
}

function EditForm({ category, allActive, onSave, onCancel }: EditFormProps) {
  const store = useCategoriesStore()
  const [name, setName] = useState(category.name)
  const [color, setColor] = useState(category.color)
  const [emoji, setEmoji] = useState(category.emoji ?? '')
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Name is required')
      return
    }
    const duplicate = allActive.some(
      (c) => c.id !== category.id && c.name.trim().toLowerCase() === trimmed.toLowerCase()
    )
    if (duplicate) {
      setError('Name already exists')
      return
    }
    try {
      await store.updateCategory(category.id, {
        name: trimmed,
        color,
        emoji: emoji.trim() || null,
      })
      onSave()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update category')
    }
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(null) }}
          placeholder="Category name"
          className="flex-1 min-w-[120px] px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-8 w-10 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
          title="Pick a color"
        />
        <input
          type="text"
          value={emoji}
          onChange={(e) => setEmoji(e.target.value.slice(0, 2))}
          maxLength={2}
          placeholder="😀"
          className="w-14 px-2 py-1 text-sm border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
        <button
          onClick={handleSave}
          className="px-3 py-1 text-sm font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1 text-sm font-medium bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Active Category Row
// ---------------------------------------------------------------------------
interface ActiveRowProps {
  category: Category
  allActive: Category[]
  isOnlyActive: boolean
  editingId: string | null
  dragOverId: string | null
  onEditStart: (id: string) => void
  onEditEnd: () => void
  onDragStart: (id: string) => void
  onDragOver: (id: string) => void
  onDrop: (id: string) => void
  onDragEnd: () => void
}

function ActiveRow({
  category,
  allActive,
  isOnlyActive,
  editingId,
  dragOverId,
  onEditStart,
  onEditEnd,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: ActiveRowProps) {
  const store = useCategoriesStore()
  const [archiveError, setArchiveError] = useState<string | null>(null)

  const isEditing = editingId === category.id
  const isDragTarget = dragOverId === category.id

  const handleArchive = async () => {
    setArchiveError(null)
    try {
      await store.archiveCategory(category.id)
    } catch (err) {
      setArchiveError(err instanceof Error ? err.message : 'Failed to archive')
    }
  }

  return (
    <div
      draggable={!isEditing}
      onDragStart={() => onDragStart(category.id)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(category.id) }}
      onDrop={() => onDrop(category.id)}
      onDragEnd={onDragEnd}
      className={[
        'flex flex-col gap-1 px-3 py-2 rounded-lg border transition-colors',
        isDragTarget
          ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30'
          : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800',
      ].join(' ')}
    >
      <div className="flex items-center gap-3">
        {/* Drag handle */}
        <span
          className="text-gray-400 cursor-grab active:cursor-grabbing select-none text-lg"
          title="Drag to reorder"
        >
          ⠿
        </span>

        {/* Color swatch */}
        <span
          className="w-4 h-4 rounded-full flex-shrink-0 border border-black/10"
          style={{ backgroundColor: category.color }}
        />

        {/* Emoji */}
        {category.emoji && (
          <span className="text-base leading-none">{category.emoji}</span>
        )}

        {/* Name */}
        <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
          {category.name}
        </span>

        {/* Actions */}
        {!isEditing && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => onEditStart(category.id)}
              className="px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors dark:text-indigo-400 dark:bg-indigo-900/30 dark:hover:bg-indigo-800/40"
            >
              Edit
            </button>
            <div className="relative group">
              <button
                onClick={handleArchive}
                disabled={isOnlyActive}
                className={[
                  'px-2 py-1 text-xs font-medium rounded transition-colors',
                  isOnlyActive
                    ? 'text-gray-400 bg-gray-100 cursor-not-allowed dark:text-gray-600 dark:bg-gray-700'
                    : 'text-amber-600 bg-amber-50 hover:bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30 dark:hover:bg-amber-800/40',
                ].join(' ')}
              >
                Archive
              </button>
              {isOnlyActive && (
                <div className="absolute right-0 bottom-full mb-1 hidden group-hover:block z-10">
                  <div className="bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                    Cannot archive the only active category
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Inline edit form */}
      {isEditing && (
        <EditForm
          category={category}
          allActive={allActive}
          onSave={onEditEnd}
          onCancel={onEditEnd}
        />
      )}

      {/* Archive error */}
      {archiveError && (
        <p className="text-red-500 text-xs mt-1">{archiveError}</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Add Category Form
// ---------------------------------------------------------------------------
function AddCategoryForm({ allActive }: { allActive: Category[] }) {
  const store = useCategoriesStore()
  const [name, setName] = useState('')
  const [color, setColor] = useState('#6366f1')
  const [emoji, setEmoji] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Name is required')
      return
    }
    const duplicate = allActive.some(
      (c) => c.name.trim().toLowerCase() === trimmed.toLowerCase()
    )
    if (duplicate) {
      setError('Name already exists')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await store.createCategory({
        name: trimmed,
        color,
        ...(emoji.trim() ? { emoji: emoji.trim() } : {}),
      })
      setName('')
      setColor('#6366f1')
      setEmoji('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-3 border border-dashed border-gray-300 rounded-lg dark:border-gray-600">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-gray-400">
        Add Category
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(null) }}
          placeholder="Category name"
          className="flex-1 min-w-[120px] px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-8 w-10 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
          title="Pick a color"
        />
        <input
          type="text"
          value={emoji}
          onChange={(e) => setEmoji(e.target.value.slice(0, 2))}
          maxLength={2}
          placeholder="😀"
          className="w-14 px-2 py-1 text-sm border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
        <button
          type="submit"
          disabled={submitting}
          className="px-3 py-1 text-sm font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Adding…' : 'Add Category'}
        </button>
      </div>
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </form>
  )
}

// ---------------------------------------------------------------------------
// CategoryManager (main export)
// ---------------------------------------------------------------------------
export function CategoryManager() {
  const store = useCategoriesStore()
  const active = store.getActive()
  const archived = store.getArchived()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const dragSourceId = useRef<string | null>(null)
  const [archivedOpen, setArchivedOpen] = useState(false)

  useEffect(() => {
    store.load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- Drag handlers ---
  const handleDragStart = (id: string) => {
    dragSourceId.current = id
  }

  const handleDragOver = (id: string) => {
    if (id !== dragSourceId.current) {
      setDragOverId(id)
    }
  }

  const handleDrop = (targetId: string) => {
    const sourceId = dragSourceId.current
    if (!sourceId || sourceId === targetId) {
      setDragOverId(null)
      return
    }
    const currentOrder = active.map((c) => c.id)
    const fromIdx = currentOrder.indexOf(sourceId)
    const toIdx = currentOrder.indexOf(targetId)
    if (fromIdx === -1 || toIdx === -1) {
      setDragOverId(null)
      return
    }
    const newOrder = [...currentOrder]
    newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, sourceId)
    store.reorderCategories(newOrder)
    setDragOverId(null)
  }

  const handleDragEnd = () => {
    dragSourceId.current = null
    setDragOverId(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Active Categories
        </h3>
        <div className="flex flex-col gap-2">
          {active.length === 0 && (
            <p className="text-sm text-gray-400 italic py-2">No active categories.</p>
          )}
          {active.map((category) => (
            <ActiveRow
              key={category.id}
              category={category}
              allActive={active}
              isOnlyActive={active.length === 1}
              editingId={editingId}
              dragOverId={dragOverId}
              onEditStart={(id) => setEditingId(id)}
              onEditEnd={() => setEditingId(null)}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>
      </div>

      {/* Add form */}
      <AddCategoryForm allActive={active} />

      {/* Archived section */}
      {archived.length > 0 && (
        <div>
          <button
            onClick={() => setArchivedOpen((o) => !o)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors mb-2 w-full text-left"
          >
            <span className={`transition-transform ${archivedOpen ? 'rotate-90' : ''}`}>
              ▶
            </span>
            Archived Categories
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full dark:bg-gray-700 dark:text-gray-400">
              {archived.length}
            </span>
          </button>
          {archivedOpen && (
            <div className="flex flex-col gap-2">
              {archived.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50 opacity-60"
                >
                  <span
                    className="w-4 h-4 rounded-full flex-shrink-0 border border-black/10"
                    style={{ backgroundColor: category.color }}
                  />
                  {category.emoji && (
                    <span className="text-base leading-none">{category.emoji}</span>
                  )}
                  <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {category.name}
                  </span>
                  <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-500 rounded dark:bg-gray-700 dark:text-gray-400">
                    archived
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
