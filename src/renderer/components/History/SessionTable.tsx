import React, { useState } from 'react'
import type { Session, Category } from '../../../shared/types'

interface SessionTableProps {
  sessions: Session[]
  categories: Category[]
  onDelete: (id: string) => void
  onUpdateNote: (id: string, note: string | null) => void
  isLoading: boolean
}

const PAGE_SIZE = 25

function formatDateTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }) + ' · ' + d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function formatDuration(minutes: number): string {
  return Number.isInteger(minutes) ? `${minutes} min` : `${minutes} min`
}

export default function SessionTable({
  sessions,
  categories,
  onDelete,
  onUpdateNote,
  isLoading,
}: SessionTableProps) {
  const [page, setPage] = useState(0)
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')

  const categoryMap = new Map<string, Category>(categories.map((c) => [c.id, c]))

  const totalPages = Math.ceil(sessions.length / PAGE_SIZE)
  const start = page * PAGE_SIZE
  const end = Math.min(start + PAGE_SIZE, sessions.length)
  const pageRows = sessions.slice(start, end)

  function toggleNote(id: string) {
    setExpandedNotes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function startEdit(session: Session) {
    setEditingId(session.id)
    setEditValue(session.note ?? '')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditValue('')
  }

  function saveEdit(id: string) {
    const trimmed = editValue.trim()
    onUpdateNote(id, trimmed.length > 0 ? trimmed : null)
    setEditingId(null)
    setEditValue('')
  }

  function handleDelete(id: string) {
    if (window.confirm('Delete this session?')) {
      onDelete(id)
    }
  }

  if (isLoading) {
    return (
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {['Date & Time', 'Subject', 'Duration', 'Type', 'Note', 'Actions'].map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-900">
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 6 }).map((__, j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400 text-base">
          No sessions found. Start your first Pomodoro!
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {['Date & Time', 'Subject', 'Duration', 'Type', 'Note', 'Actions'].map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-900">
            {pageRows.map((session) => {
              const isEditing = editingId === session.id
              const isExpanded = expandedNotes.has(session.id)
              const note = session.note ?? ''
              const truncated = note.length > 60 ? note.slice(0, 60) + '...' : note
              const subjectName = categoryMap.get(session.category_id)?.name ?? session.category_id

              return (
                <tr key={session.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  {/* Date & Time */}
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">
                    {formatDateTime(session.started_at)}
                  </td>

                  {/* Subject */}
                  <td className="px-4 py-3 text-gray-800 dark:text-gray-200 font-medium">
                    {subjectName}
                  </td>

                  {/* Duration */}
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">
                    {formatDuration(session.duration_minutes)}
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3">
                    {session.session_type === 'completed' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        Completed
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                        Partial
                      </span>
                    )}
                  </td>

                  {/* Note */}
                  <td className="px-4 py-3 max-w-xs">
                    {isEditing ? (
                      <div className="flex flex-col gap-2">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          rows={3}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => saveEdit(session.id)}
                            className="px-2 py-1 text-xs font-medium bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="px-2 py-1 text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : note.length > 0 ? (
                      <span
                        onClick={() => toggleNote(session.id)}
                        className="cursor-pointer text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                        title={isExpanded ? 'Click to collapse' : 'Click to expand'}
                      >
                        {isExpanded ? note : truncated}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-600 italic text-xs">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    {!isEditing && (
                      <div className="flex items-center gap-2">
                        {/* Pencil icon */}
                        <button
                          type="button"
                          onClick={() => startEdit(session)}
                          title="Edit note"
                          className="p-1 text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        {/* Trash icon */}
                        <button
                          type="button"
                          onClick={() => handleDelete(session.id)}
                          title="Delete session"
                          className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Showing {start + 1}–{end} of {sessions.length}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 0}
            className="px-3 py-1.5 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
