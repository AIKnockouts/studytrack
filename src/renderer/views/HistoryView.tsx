import React, { useEffect, useState } from 'react'
import type { Session, Category, SessionFilter } from '../../shared/types'
import FilterBar from '../components/History/FilterBar'
import SessionTable from '../components/History/SessionTable'
import { exportSessionsToCsv } from '../utils/csvExport'

export default function HistoryView() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [filter, setFilter] = useState<SessionFilter>({})
  const [isLoading, setIsLoading] = useState(true)

  async function fetchData(currentFilter: SessionFilter) {
    setIsLoading(true)
    const [sessionsRes, categoriesRes] = await Promise.all([
      window.api.sessions.getAll(currentFilter),
      window.api.categories.getAll(),
    ])
    if (sessionsRes.data) setSessions(sessionsRes.data)
    if (categoriesRes.data) setCategories(categoriesRes.data)
    setIsLoading(false)
  }

  useEffect(() => {
    fetchData(filter)
  }, [filter])

  function handleFilterChange(newFilter: SessionFilter) {
    setFilter(newFilter)
  }

  async function handleDelete(id: string) {
    await window.api.sessions.delete(id)
    fetchData(filter)
  }

  async function handleUpdateNote(id: string, note: string | null) {
    await window.api.sessions.updateNote(id, note)
    fetchData(filter)
  }

  function handleExport() {
    exportSessionsToCsv(sessions, categories)
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#f5f5f5]">Session History</h1>
        <button
          type="button"
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-transparent border border-[#333333] text-[#f5f5f5] rounded-lg hover:bg-[#1a1a1a] transition-colors focus:outline-none"
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
              d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <FilterBar
        categories={categories}
        filter={filter}
        onChange={handleFilterChange}
      />

      {/* Table */}
      <SessionTable
        sessions={sessions}
        categories={categories}
        onDelete={handleDelete}
        onUpdateNote={handleUpdateNote}
        isLoading={isLoading}
      />
    </div>
  )
}
