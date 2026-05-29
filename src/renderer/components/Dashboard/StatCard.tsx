import React from 'react'

interface StatCardProps {
  label: string
  value: string
  subLabel?: string
  icon?: React.ReactNode
}

const StatCard: React.FC<StatCardProps> = ({ label, value, subLabel, icon }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-start gap-3 shadow-sm">
      {icon && (
        <div className="text-gray-400 dark:text-gray-500 mt-0.5 shrink-0 text-xl">
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">
          {label}
        </p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-none">
          {value}
        </p>
        {subLabel && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {subLabel}
          </p>
        )}
      </div>
    </div>
  )
}

export default StatCard
