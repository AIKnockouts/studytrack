import Database from 'better-sqlite3'
import { mkdirSync } from 'fs'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import type { Session, Category, SessionFilter } from '../shared/types'
import { DEFAULT_SETTINGS } from '../shared/types'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized. Call initializeDb() first.')
  return db
}

export function initializeDb(dataDir: string): void {
  mkdirSync(dataDir, { recursive: true })
  db = new Database(join(dataDir, 'studytrack.db'))
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  createSchema()
  seedDefaults()
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}

function createSchema(): void {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id          TEXT PRIMARY KEY,
      name        TEXT UNIQUE NOT NULL,
      color       TEXT NOT NULL DEFAULT '#6366f1',
      emoji       TEXT,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      archived_at INTEGER,
      created_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id               TEXT PRIMARY KEY,
      started_at       INTEGER NOT NULL,
      ended_at         INTEGER NOT NULL,
      duration_minutes REAL NOT NULL,
      category_id      TEXT NOT NULL REFERENCES categories(id),
      session_type     TEXT NOT NULL CHECK(session_type IN ('completed', 'partial')),
      note             TEXT,
      created_at       INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_category ON sessions(category_id);

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS plugin_state (
      plugin_id TEXT PRIMARY KEY,
      enabled   INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS plugin_storage (
      plugin_id TEXT NOT NULL,
      key       TEXT NOT NULL,
      value     TEXT NOT NULL,
      PRIMARY KEY (plugin_id, key)
    );
  `)
}

function seedDefaults(): void {
  const d = getDb()
  const count = (d.prepare('SELECT COUNT(*) as c FROM categories').get() as { c: number }).c
  if (count === 0) {
    const now = Date.now()
    const defaults = [
      { name: 'CS / Coding', color: '#6366f1', emoji: '💻' },
      { name: 'Math', color: '#f59e0b', emoji: '📐' },
      { name: 'Science', color: '#10b981', emoji: '🔬' },
      { name: 'Language Learning', color: '#ef4444', emoji: '🌍' },
    ]
    const ins = d.prepare(
      'INSERT INTO categories (id, name, color, emoji, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    defaults.forEach((cat, i) => ins.run(uuidv4(), cat.name, cat.color, cat.emoji, i, now))
  }

  const setSetting = d.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
  for (const [key, val] of Object.entries(DEFAULT_SETTINGS)) {
    setSetting.run(key, JSON.stringify(val))
  }
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export function sessionsGetAll(filter?: SessionFilter): Session[] {
  const d = getDb()
  const parts: string[] = ['SELECT * FROM sessions WHERE 1=1']
  const params: (string | number)[] = []

  if (filter?.category_ids?.length) {
    parts.push(`AND category_id IN (${filter.category_ids.map(() => '?').join(',')})`)
    params.push(...filter.category_ids)
  }
  if (filter?.session_type) {
    parts.push('AND session_type = ?')
    params.push(filter.session_type)
  }
  if (filter?.start_date) {
    parts.push('AND started_at >= ?')
    params.push(new Date(filter.start_date + 'T00:00:00').getTime())
  }
  if (filter?.end_date) {
    parts.push('AND started_at <= ?')
    params.push(new Date(filter.end_date + 'T23:59:59.999').getTime())
  }
  parts.push('ORDER BY started_at DESC')

  return d.prepare(parts.join(' ')).all(...params) as Session[]
}

export function sessionsGetByDate(date: string): Session[] {
  const start = new Date(date + 'T00:00:00').getTime()
  const end = new Date(date + 'T23:59:59.999').getTime()
  return getDb()
    .prepare('SELECT * FROM sessions WHERE started_at >= ? AND started_at <= ? ORDER BY started_at')
    .all(start, end) as Session[]
}

export function sessionsCreate(
  data: Omit<Session, 'id' | 'created_at'>
): Session {
  const id = uuidv4()
  const created_at = Date.now()
  getDb()
    .prepare(
      `INSERT INTO sessions
       (id, started_at, ended_at, duration_minutes, category_id, session_type, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, data.started_at, data.ended_at, data.duration_minutes, data.category_id, data.session_type, data.note ?? null, created_at)
  return { ...data, id, created_at }
}

export function sessionsUpdateNote(id: string, note: string | null): void {
  getDb().prepare('UPDATE sessions SET note = ? WHERE id = ?').run(note, id)
}

export function sessionsDelete(id: string): void {
  getDb().prepare('DELETE FROM sessions WHERE id = ?').run(id)
}

// ─── Categories ──────────────────────────────────────────────────────────────

export function categoriesGetAll(): Category[] {
  return getDb()
    .prepare('SELECT * FROM categories ORDER BY sort_order')
    .all() as Category[]
}

export function categoriesCreate(data: {
  name: string
  color: string
  emoji?: string
}): Category {
  const d = getDb()
  const trimmed = data.name.trim()
  if (!trimmed) throw new Error('Category name cannot be empty')
  const dup = d
    .prepare('SELECT COUNT(*) as c FROM categories WHERE name = ?')
    .get(trimmed) as { c: number }
  if (dup.c > 0) throw new Error(`Category "${trimmed}" already exists`)

  const id = uuidv4()
  const maxRow = d
    .prepare('SELECT COALESCE(MAX(sort_order), -1) as m FROM categories')
    .get() as { m: number }
  const now = Date.now()
  d.prepare(
    'INSERT INTO categories (id, name, color, emoji, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, trimmed, data.color, data.emoji ?? null, maxRow.m + 1, now)
  return d.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category
}

export function categoriesUpdate(
  id: string,
  updates: { name?: string; color?: string; emoji?: string | null }
): Category {
  const d = getDb()
  if (updates.name !== undefined) {
    const trimmed = updates.name.trim()
    if (!trimmed) throw new Error('Category name cannot be empty')
    const dup = d
      .prepare('SELECT COUNT(*) as c FROM categories WHERE name = ? AND id != ?')
      .get(trimmed, id) as { c: number }
    if (dup.c > 0) throw new Error(`Category "${trimmed}" already exists`)
    d.prepare('UPDATE categories SET name = ? WHERE id = ?').run(trimmed, id)
  }
  if (updates.color !== undefined) {
    d.prepare('UPDATE categories SET color = ? WHERE id = ?').run(updates.color, id)
  }
  if (updates.emoji !== undefined) {
    d.prepare('UPDATE categories SET emoji = ? WHERE id = ?').run(updates.emoji, id)
  }
  return d.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category
}

export function categoriesArchive(id: string): void {
  const d = getDb()
  const activeCount = (
    d.prepare('SELECT COUNT(*) as c FROM categories WHERE archived_at IS NULL').get() as { c: number }
  ).c
  if (activeCount <= 1) throw new Error('Cannot archive the last active category')
  d.prepare('UPDATE categories SET archived_at = ? WHERE id = ?').run(Date.now(), id)
}

export function categoriesReorder(orderedIds: string[]): void {
  const d = getDb()
  const stmt = d.prepare('UPDATE categories SET sort_order = ? WHERE id = ?')
  d.transaction(() => {
    orderedIds.forEach((catId, i) => stmt.run(i, catId))
  })()
}

// ─── Settings ────────────────────────────────────────────────────────────────

export function settingsGet(key: string): unknown {
  const row = getDb()
    .prepare('SELECT value FROM settings WHERE key = ?')
    .get(key) as { value: string } | undefined
  if (!row) return undefined
  try {
    return JSON.parse(row.value)
  } catch {
    return row.value
  }
}

export function settingsSet(key: string, value: unknown): void {
  getDb()
    .prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    .run(key, JSON.stringify(value))
}

export function settingsGetAll(): Record<string, unknown> {
  const rows = getDb()
    .prepare('SELECT key, value FROM settings')
    .all() as { key: string; value: string }[]
  return Object.fromEntries(
    rows.map((r) => {
      try {
        return [r.key, JSON.parse(r.value)]
      } catch {
        return [r.key, r.value]
      }
    })
  )
}

// ─── Plugin state ─────────────────────────────────────────────────────────────

export function pluginGetEnabled(): Record<string, boolean> {
  const rows = getDb()
    .prepare('SELECT plugin_id, enabled FROM plugin_state')
    .all() as { plugin_id: string; enabled: number }[]
  return Object.fromEntries(rows.map((r) => [r.plugin_id, r.enabled === 1]))
}

export function pluginSetEnabled(pluginId: string, enabled: boolean): void {
  getDb()
    .prepare('INSERT OR REPLACE INTO plugin_state (plugin_id, enabled) VALUES (?, ?)')
    .run(pluginId, enabled ? 1 : 0)
}

export function pluginStorageGet(pluginId: string, key: string): unknown {
  const row = getDb()
    .prepare('SELECT value FROM plugin_storage WHERE plugin_id = ? AND key = ?')
    .get(pluginId, key) as { value: string } | undefined
  if (!row) return undefined
  try {
    return JSON.parse(row.value)
  } catch {
    return row.value
  }
}

export function pluginStorageSet(pluginId: string, key: string, value: unknown): void {
  getDb()
    .prepare('INSERT OR REPLACE INTO plugin_storage (plugin_id, key, value) VALUES (?, ?, ?)')
    .run(pluginId, key, JSON.stringify(value))
}
