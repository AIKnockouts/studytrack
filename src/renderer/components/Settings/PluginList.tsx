import React, { useEffect, useState } from 'react'
import type { LoadedPlugin } from '../../../shared/types'

// ---- Toggle Switch ----------------------------------------------------------

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={[
      'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent',
      'transition-colors duration-200 ease-in-out',
      'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
      checked ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600',
      disabled ? 'opacity-50 cursor-not-allowed' : '',
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

// ---- Skeleton Row -----------------------------------------------------------

const SkeletonRow: React.FC = () => (
  <div className="flex items-center justify-between py-4 animate-pulse">
    <div className="flex-1 space-y-2 pr-6">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
      <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-2/3" />
    </div>
    <div className="h-5 w-9 bg-gray-200 dark:bg-gray-700 rounded-full" />
  </div>
)

// ---- Plugin Row -------------------------------------------------------------

interface PluginRowProps {
  plugin: LoadedPlugin
  onToggle: (id: string, enable: boolean) => void
}

const PluginRow: React.FC<PluginRowProps> = ({ plugin, onToggle }) => {
  const [errorExpanded, setErrorExpanded] = useState(false)
  const { manifest, enabled, error } = plugin

  return (
    <div className="py-4 border-b border-gray-100 dark:border-gray-800 last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
              {manifest.name}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
              v{manifest.version}
            </span>
            {error && (
              <button
                type="button"
                onClick={() => setErrorExpanded((prev) => !prev)}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
                title={error}
              >
                Error
                <span className="text-red-500 dark:text-red-400">
                  {errorExpanded ? '▲' : '▼'}
                </span>
              </button>
            )}
          </div>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
            {manifest.description}
          </p>
          {manifest.author && (
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
              by {manifest.author}
            </p>
          )}
          {/* Error details (expandable) */}
          {error && errorExpanded && (
            <div className="mt-2 p-2 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-xs font-mono text-red-700 dark:text-red-300 break-all whitespace-pre-wrap">
                {error}
              </p>
            </div>
          )}
        </div>

        {/* Toggle */}
        <ToggleSwitch
          checked={enabled}
          onChange={(val) => onToggle(manifest.id, val)}
        />
      </div>
    </div>
  )
}

// ---- PluginList -------------------------------------------------------------

const PluginList: React.FC = () => {
  const [plugins, setPlugins] = useState<LoadedPlugin[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    window.api.plugins.getInstalled().then((response) => {
      setPlugins(response.data ?? [])
      setIsLoading(false)
    }).catch((e) => {
      console.error('[PluginList] failed to load plugins:', e)
      setIsLoading(false)
    })
  }, [])

  const handleToggle = async (id: string, enable: boolean) => {
    // Optimistic update
    setPlugins((prev) =>
      prev.map((p) => (p.manifest.id === id ? { ...p, enabled: enable } : p))
    )

    const result = enable
      ? await window.api.plugins.enable(id)
      : await window.api.plugins.disable(id)

    // Revert on failure
    if (!result.data) {
      setPlugins((prev) =>
        prev.map((p) => (p.manifest.id === id ? { ...p, enabled: !enable } : p))
      )
    }
  }

  if (isLoading) {
    return (
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        <SkeletonRow />
        <SkeletonRow />
      </div>
    )
  }

  if (plugins.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No plugins installed. Place plugin folders in{' '}
          <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs font-mono">
            ~/.studytrack/plugins/
          </code>{' '}
          and restart the app.
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {plugins.map((plugin) => (
        <PluginRow key={plugin.manifest.id} plugin={plugin} onToggle={handleToggle} />
      ))}
    </div>
  )
}

export default PluginList
