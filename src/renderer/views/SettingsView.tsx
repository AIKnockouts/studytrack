import React, { useEffect, useState } from 'react'
import type { Settings } from '../../shared/types'
import { DEFAULT_SETTINGS } from '../../shared/types'
import CategoryManager from '../components/Settings/CategoryManager'
import PluginList from '../components/Settings/PluginList'

// ---- Types ------------------------------------------------------------------

type TabId = 'timer' | 'appearance' | 'categories' | 'data' | 'plugins'

interface Tab {
  id: TabId
  label: string
}

const TABS: Tab[] = [
  { id: 'timer', label: 'Timer' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'categories', label: 'Categories' },
  { id: 'data', label: 'Data' },
  { id: 'plugins', label: 'Plugins' },
]

// ---- Shared primitives ------------------------------------------------------

interface LabeledRowProps {
  label: string
  htmlFor?: string
  children: React.ReactNode
}

const LabeledRow: React.FC<LabeledRowProps> = ({ label, htmlFor, children }) => (
  <div className="flex items-center justify-between gap-6 py-2">
    <label
      htmlFor={htmlFor}
      className="text-sm text-gray-700 dark:text-gray-300 flex-1 cursor-pointer select-none"
    >
      {label}
    </label>
    <div className="shrink-0">{children}</div>
  </div>
)

// ---- Toggle Switch ----------------------------------------------------------

interface ToggleSwitchProps {
  id?: string
  checked: boolean
  onChange: (checked: boolean) => void
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ id, checked, onChange }) => (
  <button
    id={id}
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={[
      'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent',
      'transition-colors duration-200 ease-in-out',
      'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
      checked ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600',
    ]
      .join(' ')
      .trim()}
  >
    <span
      className={[
        'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow',
        'transform transition duration-200 ease-in-out',
        checked ? 'translate-x-4' : 'translate-x-0',
      ]
        .join(' ')
        .trim()}
    />
  </button>
)

// ---- Number Input with validation -------------------------------------------

interface NumberInputProps {
  id?: string
  value: number
  min: number
  max: number
  unit?: string
  onChange: (value: number) => void
}

const NumberInput: React.FC<NumberInputProps> = ({ id, value, min, max, unit, onChange }) => {
  const [raw, setRaw] = useState(String(value))
  const [error, setError] = useState<string | null>(null)

  // Sync raw display when external value changes (e.g. initial load)
  useEffect(() => {
    setRaw(String(value))
    setError(null)
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value
    setRaw(text)
    const num = Number(text)
    if (!text || isNaN(num) || !Number.isInteger(num)) {
      setError('Must be a whole number')
      return
    }
    if (num < min) {
      setError(`Minimum is ${min}`)
      return
    }
    if (num > max) {
      setError(`Maximum is ${max}`)
      return
    }
    setError(null)
    onChange(num)
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          value={raw}
          onChange={handleChange}
          className={[
            'w-20 px-2 py-1 rounded-lg border text-sm text-right',
            'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
            error
              ? 'border-red-400 dark:border-red-500'
              : 'border-gray-300 dark:border-gray-600',
          ]
            .join(' ')
            .trim()}
        />
        {unit && (
          <span className="text-xs text-gray-500 dark:text-gray-400 w-8">{unit}</span>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}

// ---- Section wrapper --------------------------------------------------------

interface SectionProps {
  title: string
  children: React.ReactNode
}

const Section: React.FC<SectionProps> = ({ title, children }) => (
  <div className="mb-6">
    <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
      {title}
    </h3>
    <div className="divide-y divide-gray-100 dark:divide-gray-800">{children}</div>
  </div>
)

// ---- Timer Tab --------------------------------------------------------------

interface TimerTabProps {
  settings: Settings
  onSet: (key: keyof Settings, value: unknown) => void
}

const TimerTab: React.FC<TimerTabProps> = ({ settings, onSet }) => (
  <div>
    <Section title="Session lengths">
      <LabeledRow label="Work duration" htmlFor="work_duration">
        <NumberInput
          id="work_duration"
          value={settings.work_duration}
          min={1}
          max={120}
          unit="min"
          onChange={(v) => onSet('work_duration', v)}
        />
      </LabeledRow>
      <LabeledRow label="Short break" htmlFor="short_break_duration">
        <NumberInput
          id="short_break_duration"
          value={settings.short_break_duration}
          min={1}
          max={60}
          unit="min"
          onChange={(v) => onSet('short_break_duration', v)}
        />
      </LabeledRow>
      <LabeledRow label="Long break" htmlFor="long_break_duration">
        <NumberInput
          id="long_break_duration"
          value={settings.long_break_duration}
          min={1}
          max={120}
          unit="min"
          onChange={(v) => onSet('long_break_duration', v)}
        />
      </LabeledRow>
      <LabeledRow label="Sessions before long break" htmlFor="sessions_before_long_break">
        <NumberInput
          id="sessions_before_long_break"
          value={settings.sessions_before_long_break}
          min={1}
          max={10}
          onChange={(v) => onSet('sessions_before_long_break', v)}
        />
      </LabeledRow>
    </Section>

    <Section title="Alerts">
      <LabeledRow label="Sound on complete" htmlFor="sound_on_complete">
        <ToggleSwitch
          id="sound_on_complete"
          checked={settings.sound_on_complete}
          onChange={(v) => onSet('sound_on_complete', v)}
        />
      </LabeledRow>
      <LabeledRow label="Notification on complete" htmlFor="notification_on_complete">
        <ToggleSwitch
          id="notification_on_complete"
          checked={settings.notification_on_complete}
          onChange={(v) => onSet('notification_on_complete', v)}
        />
      </LabeledRow>
    </Section>

    <Section title="Automation">
      <LabeledRow label="Auto-start break" htmlFor="auto_start_break">
        <ToggleSwitch
          id="auto_start_break"
          checked={settings.auto_start_break}
          onChange={(v) => onSet('auto_start_break', v)}
        />
      </LabeledRow>
      <LabeledRow label="Auto-start next work session" htmlFor="auto_start_next_work">
        <ToggleSwitch
          id="auto_start_next_work"
          checked={settings.auto_start_next_work}
          onChange={(v) => onSet('auto_start_next_work', v)}
        />
      </LabeledRow>
    </Section>

    <Section title="Partial sessions">
      <div className="py-2 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="partial_threshold"
            className="text-sm text-gray-700 dark:text-gray-300"
          >
            Partial session threshold
          </label>
          <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400 w-12 text-right">
            {settings.partial_threshold}%
          </span>
        </div>
        <input
          id="partial_threshold"
          type="range"
          min={0}
          max={100}
          value={settings.partial_threshold}
          onChange={(e) => onSet('partial_threshold', Number(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Sessions stopped below this percentage of the planned time are still logged as partial.
        </p>
      </div>
    </Section>
  </div>
)

// ---- Appearance Tab ---------------------------------------------------------

interface AppearanceTabProps {
  settings: Settings
  onSet: (key: keyof Settings, value: unknown) => void
}

const AppearanceTab: React.FC<AppearanceTabProps> = ({ settings, onSet }) => {
  const applyTheme = (theme: Settings['theme']) => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      // system
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }

  const handleThemeChange = (theme: Settings['theme']) => {
    onSet('theme', theme)
    applyTheme(theme)
  }

  const handleAccentChange = (color: string) => {
    onSet('accent_color', color)
    document.documentElement.style.setProperty('--accent-color', color)
  }

  const themeOptions: { value: Settings['theme']; label: string }[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
  ]

  return (
    <div>
      <Section title="Theme">
        <div className="py-3">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">Color scheme</p>
          <div className="flex gap-2">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleThemeChange(opt.value)}
                className={[
                  'flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
                  settings.theme === opt.value
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500',
                ]
                  .join(' ')
                  .trim()}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Accent color">
        <LabeledRow label="Accent color" htmlFor="accent_color">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">
              {settings.accent_color}
            </span>
            <input
              id="accent_color"
              type="color"
              value={settings.accent_color}
              onChange={(e) => handleAccentChange(e.target.value)}
              className="h-8 w-10 cursor-pointer rounded border border-gray-300 dark:border-gray-600 bg-transparent p-0.5"
            />
          </div>
        </LabeledRow>
      </Section>
    </div>
  )
}

// ---- Data Tab ---------------------------------------------------------------

interface DataTabProps {
  settings: Settings
  onSet: (key: keyof Settings, value: unknown) => void
}

const DataTab: React.FC<DataTabProps> = ({ settings, onSet }) => {
  const handleOpenDataDir = () => {
    window.api.app.openDataDir()
  }

  return (
    <div>
      <Section title="Storage">
        <div className="py-3 flex flex-col gap-3">
          <div>
            <label
              htmlFor="data_dir"
              className="block text-sm text-gray-700 dark:text-gray-300 mb-1"
            >
              Data folder
            </label>
            <input
              id="data_dir"
              type="text"
              value={settings.data_dir}
              onChange={(e) => onSet('data_dir', e.target.value)}
              placeholder="e.g. /Users/you/.studytrack"
              className={[
                'w-full px-3 py-2 rounded-lg border text-sm',
                'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100',
                'border-gray-300 dark:border-gray-600',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
              ]
                .join(' ')
                .trim()}
            />
            <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
              Changing the data folder takes effect after restarting the app.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenDataDir}
            className={[
              'w-full sm:w-auto px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
              'bg-white dark:bg-gray-800',
              'border-gray-300 dark:border-gray-600',
              'text-gray-700 dark:text-gray-300',
              'hover:bg-gray-50 dark:hover:bg-gray-700',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
            ]
              .join(' ')
              .trim()}
          >
            Open data folder
          </button>
        </div>
      </Section>
    </div>
  )
}

// ---- SettingsView -----------------------------------------------------------

const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('timer')
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)

  // Load all settings on mount
  useEffect(() => {
    window.api.settings.getAll().then((response) => {
      if (response.data) {
        setSettings({ ...DEFAULT_SETTINGS, ...(response.data as Partial<Settings>) })
      }
    })
  }, [])

  const handleSet = (key: keyof Settings, value: unknown) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    window.api.settings.set(key, value)
  }

  return (
    <div className="flex h-full min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Left tab strip */}
      <nav className="w-44 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-6 px-3 flex flex-col gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={[
              'w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 dark:focus:ring-offset-gray-900',
              activeTab === tab.id
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200',
            ]
              .join(' ')
              .trim()}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Content area */}
      <main className="flex-1 overflow-y-auto py-8 px-8 max-w-2xl">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
          {TABS.find((t) => t.id === activeTab)?.label}
        </h2>

        {activeTab === 'timer' && (
          <TimerTab settings={settings} onSet={handleSet} />
        )}

        {activeTab === 'appearance' && (
          <AppearanceTab settings={settings} onSet={handleSet} />
        )}

        {activeTab === 'categories' && (
          <CategoryManager />
        )}

        {activeTab === 'data' && (
          <DataTab settings={settings} onSet={handleSet} />
        )}

        {activeTab === 'plugins' && (
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Manage installed plugins. Toggling a plugin requires a restart to take full effect.
            </p>
            <PluginList />
          </div>
        )}
      </main>
    </div>
  )
}

export default SettingsView
