import React, { useEffect, useState } from 'react'
import { Category } from '../../../shared/types'

interface SubjectDropdownProps {
  value: string | null
  onChange: (id: string) => void
  disabled: boolean
}

const SubjectDropdown: React.FC<SubjectDropdownProps> = ({ value, onChange, disabled }) => {
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    window.api.categories.getAll().then((response) => {
      if (response.data) {
        const active = response.data
          .filter((c) => c.archived_at === null)
          .sort((a, b) => a.sort_order - b.sort_order)
        setCategories(active)
      }
    })
  }, [])

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={[
        'w-full px-3 py-2 rounded-lg border text-sm',
        'bg-white dark:bg-gray-800',
        'text-gray-800 dark:text-gray-100',
        'border-gray-300 dark:border-gray-600',
        'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:border-gray-400 dark:hover:border-gray-500 cursor-pointer',
      ]
        .join(' ')
        .trim()}
    >
      <option value="" disabled>
        Select a subject
      </option>
      {categories.map((cat) => (
        <option key={cat.id} value={cat.id}>
          {cat.emoji ? `${cat.emoji} ${cat.name}` : cat.name}
        </option>
      ))}
    </select>
  )
}

export default SubjectDropdown
