import React from 'react'

interface StatCardProps {
  label: string
  value: string
  subLabel?: string
  icon?: React.ReactNode
}

const StatCard: React.FC<StatCardProps> = ({ label, value, subLabel, icon }) => {
  return (
    <div className="bg-[#111111] rounded-xl border border-[#222222] p-4 flex items-start gap-3">
      {icon && (
        <div className="text-[#555555] mt-0.5 shrink-0 text-base">
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wider text-[#888888] mb-1">
          {label}
        </p>
        <p className="text-2xl font-semibold text-[#f5f5f5] leading-none">
          {value}
        </p>
        {subLabel && (
          <p className="text-xs text-[#555555] mt-1">
            {subLabel}
          </p>
        )}
      </div>
    </div>
  )
}

export default StatCard
