import React, { useState } from 'react'
import type { Category, SessionFilter } from '../../../shared/types'

interface FilterBarProps {
  categories: Category[]
  filter: SessionFilter
  onChange: (f: SessionFilter) => void
}

export default function FilterBar({ categories, filter, onChange }: FilterBarProps) {
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)

  const selectedCategoryIds = filter.category_ids ?? []

  function handleStartDate(e: React.ChangeEvent<HTMLInputElement>) {
    onChange({ ...filter, start_date: e.target.value || undefined })
  }

  function handleEndDate(e: React.ChangeEvent<HTMLInputElement>) {
    onChange({ ...filter, end_date: e.target.value || undefined })
  }

  function handleCategoryToggle(id: string) {
    const current = selectedCategoryIds
    const next = current.includes(id) ? current.filter((c) => c !== id) : [...current, id]
    onChange({ ...filter, category_ids: next.length > 0 ? next : undefined })
  }

  function handleSessionType(type: 'completed' | 'partial' | undefined) {
    onChange({ ...filter, session_type: type })
  }

  function handleClearFilters() {
    onChange({})
  }

  const sessionTypeOptions: { label: string; value: 'completed' | 'partial' | undefined }[] = [
    { label: 'All', value: undefined },
    { label: 'Completed', value: 'completed' },
    { label: 'Partial', value: 'partial' },
  ]

  return (
    <div className="flex flex-wrap items-end gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Date range */}
      <div className="flex items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Start date</label>
          <input
            type="date"
            value={filter.start_date ?? ''}
            onChange={handleStartDate}
            className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <span className="pb-2 text-gray-400">–</span>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">End date</label>
          <input
            type="date"
            value={filter.end_date ?? ''}
            onChange={handleEndDate}
            className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Category multi-select dropdown */}
      <div className="flex flex-col gap-1 relative">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Subject</label>
        <button
          type="button"
          onClick={() => setCategoryDropdownOpen((o) => !o)}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-left min-w-[140px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {selectedCategoryIds.length === 0
            ? 'All subjects'
            : `${selectedCategoryIds.length} selected`}
          <span className="float-right ml-2 text-gray-400">▾</span>
        </button>
        {categoryDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 z-20 w-52 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-56 overflow-y-auto">
            {categories.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-500">No categories</p>
            ) : (
              categories.map((cat) => (
                <label
                  key={cat.id}
                  className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  <input
                    type="checkbox"
                    checked={selectedCategoryIds.includes(cat.id)}
                    onChange={() => handleCategoryToggle(cat.id)}
                    className="accent-indigo-500"
                  />
                  {cat.emoji && <span>{cat.emoji}</span>}
                  <span className="text-gray-800 dark:text-gray-200">{cat.name}</span>
                </label>
              ))
            )}
          </div>
        )}
      </div>

      {/* Session type toggle */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Type</label>
        <div className="flex rounded-md overflow-hidden border border-gray-300 dark:border-gray-600">
          {sessionTypeOptions.map(({ label, value }) => {
            const isActive = filter.session_type === value
            return (
              <button
                key={label}
                type="button"
                onClick={() => handleSessionType(value)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500
                  ${isActive
                    ? 'bg-indigo-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Clear filters */}
      <button
        type="button"
        onClick={handleClearFilters}
        className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        Clear Filters
      </button>
    </div>
  )
}
