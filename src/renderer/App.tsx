import React, { useState, useEffect } from 'react'
import TimerView from './views/TimerView'
import DashboardView from './views/DashboardView'
import HistoryView from './views/HistoryView'
import SettingsView from './views/SettingsView'

type ViewId = 'timer' | 'dashboard' | 'history' | 'settings'

interface NavItem {
  id: ViewId
  label: string
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'timer', label: 'Timer', icon: '◷' },
  { id: 'dashboard', label: 'Dashboard', icon: '◈' },
  { id: 'history', label: 'History', icon: '◫' },
  { id: 'settings', label: 'Settings', icon: '◌' },
]

export default function App() {
  const [activeView, setActiveView] = useState<ViewId>('timer')

  useEffect(() => {
    // Always force dark mode — this app is dark-only
    document.documentElement.classList.add('dark')

    const applyTheme = async () => {
      try {
        if (typeof window.api === 'undefined') return

        const settings = await window.api.settings.getAll()
        if (!settings) return

        const { accent_color } = settings

        if (accent_color) {
          document.documentElement.style.setProperty('--accent-color', accent_color)
        }
      } catch {
        // test env or api unavailable — skip gracefully
      }
    }

    applyTheme()
  }, [])

  return (
    <div className="flex h-screen min-w-[800px] bg-[#0a0a0a]">
      {/* Sidebar */}
      <aside className="w-[200px] flex-shrink-0 flex flex-col bg-[#0a0a0a] border-r border-[#1a1a1a] h-screen">
        {/* Logo */}
        <div className="px-4 py-5">
          <span className="font-semibold text-base text-[#f5f5f5] tracking-tight flex items-center gap-2">
            <span className="text-[#888888]">◆</span>
            StudyTrack
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={[
                  'w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors',
                  isActive
                    ? 'bg-[#1a1a1a] text-[#f5f5f5]'
                    : 'text-[#888888] hover:bg-[#111111] hover:text-[#f5f5f5]',
                ].join(' ')}
              >
                <span className="text-base leading-none">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3">
          <span className="text-xs text-[#333333]">v1.0.0</span>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-[#0a0a0a]">
        {activeView === 'timer' && <TimerView />}
        {activeView === 'dashboard' && <DashboardView />}
        {activeView === 'history' && <HistoryView />}
        {activeView === 'settings' && <SettingsView />}
      </main>
    </div>
  )
}
