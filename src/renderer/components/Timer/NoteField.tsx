import React, { useState } from 'react'

interface NoteFieldProps {
  value: string
  onChange: (v: string) => void
  onSave: () => void
  onSkip: () => void
}

const MAX_LENGTH = 500

const NoteField: React.FC<NoteFieldProps> = ({ value, onChange, onSave, onSkip }) => {
  const [focused, setFocused] = useState(false)
  const charsLeft = MAX_LENGTH - value.length

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          maxLength={MAX_LENGTH}
          rows={4}
          placeholder="Add a note about this session (optional)…"
          className={[
            'w-full px-3 py-2 rounded-lg border text-sm resize-none',
            'bg-white dark:bg-gray-800',
            'text-gray-800 dark:text-gray-100',
            'placeholder-gray-400 dark:placeholder-gray-500',
            focused
              ? 'border-indigo-500 ring-2 ring-indigo-500 ring-opacity-30 outline-none'
              : 'border-gray-300 dark:border-gray-600 outline-none',
          ]
            .join(' ')
            .trim()}
        />
        <span
          className={[
            'absolute bottom-2 right-3 text-xs',
            charsLeft < 50
              ? 'text-amber-500'
              : 'text-gray-400 dark:text-gray-500',
          ]
            .join(' ')
            .trim()}
        >
          {charsLeft}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onSave}
          className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Save Note
        </button>
        <button
          onClick={onSkip}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
        >
          Skip
        </button>
      </div>
    </div>
  )
}

export default NoteField
