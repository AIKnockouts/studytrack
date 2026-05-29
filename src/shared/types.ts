export interface Session {
  id: string
  started_at: number       // Unix ms
  ended_at: number         // Unix ms
  duration_minutes: number // pro-rated if partial
  category_id: string
  session_type: 'completed' | 'partial'
  note: string | null
  created_at: number       // Unix ms
}

export interface Category {
  id: string
  name: string
  color: string            // hex e.g. "#6366f1"
  emoji: string | null
  sort_order: number
  archived_at: number | null  // null = active
  created_at: number
}

export interface Settings {
  work_duration: number                     // minutes, default 25
  short_break_duration: number             // minutes, default 5
  long_break_duration: number              // minutes, default 15
  sessions_before_long_break: number       // default 4
  sound_on_complete: boolean               // default true
  notification_on_complete: boolean        // default true
  auto_start_break: boolean                // default false
  auto_start_next_work: boolean            // default false
  theme: 'light' | 'dark' | 'system'      // default 'system'
  accent_color: string                     // hex, default '#6366f1'
  partial_threshold: number                // 0-100, default 50
  data_dir: string                         // default filled at runtime
}

export const DEFAULT_SETTINGS: Settings = {
  work_duration: 25,
  short_break_duration: 5,
  long_break_duration: 15,
  sessions_before_long_break: 4,
  sound_on_complete: true,
  notification_on_complete: true,
  auto_start_break: false,
  auto_start_next_work: false,
  theme: 'system',
  accent_color: '#6366f1',
  partial_threshold: 50,
  data_dir: '',
}

export interface PluginManifest {
  id: string
  name: string
  version: string
  description: string
  author: string
  main: string
  permissions: string[]
  settings_schema: unknown[]
}

export interface LoadedPlugin {
  manifest: PluginManifest
  enabled: boolean
  path: string
  error?: string
}

export type TimerState = 'idle' | 'running' | 'paused' | 'completed' | 'abandoned'
export type SessionPhase = 'work' | 'short_break' | 'long_break'

export interface SessionFilter {
  category_ids?: string[]
  session_type?: 'completed' | 'partial'
  start_date?: string   // YYYY-MM-DD
  end_date?: string     // YYYY-MM-DD
}

export interface IpcResponse<T> {
  data?: T
  error?: string
}
