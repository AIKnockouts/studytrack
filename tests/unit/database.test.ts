import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { tmpdir } from 'os'
import { join } from 'path'
import { rmSync } from 'fs'
import {
  initializeDb,
  closeDb,
  categoriesGetAll,
  categoriesCreate,
  categoriesUpdate,
  categoriesArchive,
  categoriesReorder,
  sessionsCreate,
  sessionsGetAll,
  sessionsGetByDate,
  sessionsUpdateNote,
  sessionsDelete,
  settingsGet,
  settingsSet,
  settingsGetAll,
  pluginGetEnabled,
  pluginSetEnabled,
} from '../../src/main/database'

let counter = 0
let testDir: string

beforeEach(() => {
  testDir = join(tmpdir(), 'st-' + process.pid + '-' + (++counter))
  initializeDb(testDir)
})

afterEach(() => {
  closeDb()
  rmSync(testDir, { recursive: true, force: true })
})

// ─── Categories ───────────────────────────────────────────────────────────────

describe('categories', () => {
  it('getAll on fresh DB returns 4 categories sorted by sort_order', () => {
    const cats = categoriesGetAll()
    expect(cats).toHaveLength(4)
    for (let i = 0; i < cats.length - 1; i++) {
      expect(cats[i].sort_order).toBeLessThanOrEqual(cats[i + 1].sort_order)
    }
  })

  it('create: new category appears in getAll with correct name, color, emoji', () => {
    categoriesCreate({ name: 'History', color: '#ff0000', emoji: '📚' })
    const cats = categoriesGetAll()
    const hist = cats.find((c) => c.name === 'History')
    expect(hist).toBeDefined()
    expect(hist!.color).toBe('#ff0000')
    expect(hist!.emoji).toBe('📚')
  })

  it('create duplicate name: throws with message containing "already"', () => {
    expect(() => categoriesCreate({ name: 'Math', color: '#000' })).toThrow(/already/i)
  })

  it('create empty string: throws with message containing "empty" or "cannot"', () => {
    expect(() => categoriesCreate({ name: '', color: '#000' })).toThrow(/empty|cannot/i)
  })

  it('create whitespace-only name: throws (trimming makes it empty)', () => {
    expect(() => categoriesCreate({ name: '   ', color: '#000' })).toThrow()
  })

  it('create name with spaces: name is trimmed in DB', () => {
    categoriesCreate({ name: '  Physics  ', color: '#aabbcc' })
    const cats = categoriesGetAll()
    const phys = cats.find((c) => c.name === 'Physics')
    expect(phys).toBeDefined()
  })

  it('update name: getAll shows updated name', () => {
    const cats = categoriesGetAll()
    const math = cats.find((c) => c.name === 'Math')!
    categoriesUpdate(math.id, { name: 'Advanced Math' })
    const updated = categoriesGetAll()
    expect(updated.some((c) => c.name === 'Advanced Math')).toBe(true)
    expect(updated.some((c) => c.name === 'Math')).toBe(false)
  })

  it('update to existing name: throws', () => {
    const cats = categoriesGetAll()
    const cs = cats.find((c) => c.name === 'CS / Coding')!
    expect(() => categoriesUpdate(cs.id, { name: 'Math' })).toThrow(/already/i)
  })

  it('archive: category gets archived_at set; activeCount decreases', () => {
    const before = categoriesGetAll()
    const beforeActive = before.filter((c) => c.archived_at === null).length
    const cat = before.find((c) => c.archived_at === null)!
    categoriesArchive(cat.id)
    const after = categoriesGetAll()
    const archivedCat = after.find((c) => c.id === cat.id)!
    expect(archivedCat.archived_at).not.toBeNull()
    const afterActive = after.filter((c) => c.archived_at === null).length
    expect(afterActive).toBe(beforeActive - 1)
  })

  it('archive last active: throws with message containing "last"', () => {
    const cats = categoriesGetAll()
    const active = cats.filter((c) => c.archived_at === null)
    // archive all but one
    for (let i = 0; i < active.length - 1; i++) {
      categoriesArchive(active[i].id)
    }
    expect(() => categoriesArchive(active[active.length - 1].id)).toThrow(/last/i)
  })

  it('reorder: sort_order changes reflected in getAll', () => {
    const cats = categoriesGetAll()
    const reversed = [...cats].reverse().map((c) => c.id)
    categoriesReorder(reversed)
    const reordered = categoriesGetAll()
    expect(reordered[0].id).toBe(reversed[0])
    expect(reordered[reordered.length - 1].id).toBe(reversed[reversed.length - 1])
  })
})

// ─── Sessions ─────────────────────────────────────────────────────────────────

describe('sessions', () => {
  function getCategoryId(): string {
    return categoriesGetAll()[0].id
  }

  it('create: all fields round-trip correctly', () => {
    const catId = getCategoryId()
    const now = Date.now()
    const session = sessionsCreate({
      started_at: now,
      ended_at: now + 1500000,
      duration_minutes: 25,
      category_id: catId,
      session_type: 'completed',
      note: 'test note',
    })
    expect(session.started_at).toBe(now)
    expect(session.ended_at).toBe(now + 1500000)
    expect(session.duration_minutes).toBe(25)
    expect(session.category_id).toBe(catId)
    expect(session.session_type).toBe('completed')
    expect(session.note).toBe('test note')
  })

  it('create: id matches UUID pattern', () => {
    const catId = getCategoryId()
    const session = sessionsCreate({
      started_at: Date.now(),
      ended_at: Date.now() + 1500000,
      duration_minutes: 25,
      category_id: catId,
      session_type: 'completed',
      note: null,
    })
    expect(session.id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('getAll: returns sessions in descending started_at order', () => {
    const catId = getCategoryId()
    const base = Date.now()
    sessionsCreate({ started_at: base, ended_at: base + 1000, duration_minutes: 1, category_id: catId, session_type: 'completed', note: null })
    sessionsCreate({ started_at: base + 10000, ended_at: base + 11000, duration_minutes: 1, category_id: catId, session_type: 'completed', note: null })
    sessionsCreate({ started_at: base + 5000, ended_at: base + 6000, duration_minutes: 1, category_id: catId, session_type: 'completed', note: null })
    const all = sessionsGetAll()
    for (let i = 0; i < all.length - 1; i++) {
      expect(all[i].started_at).toBeGreaterThanOrEqual(all[i + 1].started_at)
    }
  })

  it('getAll with category_ids filter: only that category returned', () => {
    const cats = categoriesGetAll()
    const cat1 = cats[0]
    const cat2 = cats[1]
    const base = Date.now()
    sessionsCreate({ started_at: base, ended_at: base + 1000, duration_minutes: 1, category_id: cat1.id, session_type: 'completed', note: null })
    sessionsCreate({ started_at: base + 1000, ended_at: base + 2000, duration_minutes: 1, category_id: cat2.id, session_type: 'completed', note: null })
    const filtered = sessionsGetAll({ category_ids: [cat1.id] })
    expect(filtered.every((s) => s.category_id === cat1.id)).toBe(true)
    expect(filtered.some((s) => s.category_id === cat2.id)).toBe(false)
  })

  it('getAll with session_type filter: only that type returned', () => {
    const catId = getCategoryId()
    const base = Date.now()
    sessionsCreate({ started_at: base, ended_at: base + 1000, duration_minutes: 1, category_id: catId, session_type: 'completed', note: null })
    sessionsCreate({ started_at: base + 1000, ended_at: base + 2000, duration_minutes: 1, category_id: catId, session_type: 'partial', note: null })
    const filtered = sessionsGetAll({ session_type: 'completed' })
    expect(filtered.every((s) => s.session_type === 'completed')).toBe(true)
  })

  it('getAll with start_date: sessions before that date excluded', () => {
    const catId = getCategoryId()
    // Create a session clearly in the past
    const oldTs = new Date('2020-01-01T12:00:00').getTime()
    const recentTs = new Date('2026-05-29T12:00:00').getTime()
    sessionsCreate({ started_at: oldTs, ended_at: oldTs + 1000, duration_minutes: 1, category_id: catId, session_type: 'completed', note: null })
    sessionsCreate({ started_at: recentTs, ended_at: recentTs + 1000, duration_minutes: 1, category_id: catId, session_type: 'completed', note: null })
    const filtered = sessionsGetAll({ start_date: '2026-01-01' })
    expect(filtered.some((s) => s.started_at === oldTs)).toBe(false)
    expect(filtered.some((s) => s.started_at === recentTs)).toBe(true)
  })

  it('getAll with end_date: sessions after that date excluded', () => {
    const catId = getCategoryId()
    const oldTs = new Date('2020-01-01T12:00:00').getTime()
    const recentTs = new Date('2026-05-29T12:00:00').getTime()
    sessionsCreate({ started_at: oldTs, ended_at: oldTs + 1000, duration_minutes: 1, category_id: catId, session_type: 'completed', note: null })
    sessionsCreate({ started_at: recentTs, ended_at: recentTs + 1000, duration_minutes: 1, category_id: catId, session_type: 'completed', note: null })
    const filtered = sessionsGetAll({ end_date: '2021-01-01' })
    expect(filtered.some((s) => s.started_at === oldTs)).toBe(true)
    expect(filtered.some((s) => s.started_at === recentTs)).toBe(false)
  })

  it('getByDate: same calendar day sessions returned', () => {
    const catId = getCategoryId()
    const ts = new Date('2026-05-29T10:00:00').getTime()
    sessionsCreate({ started_at: ts, ended_at: ts + 1000, duration_minutes: 1, category_id: catId, session_type: 'completed', note: null })
    const result = sessionsGetByDate('2026-05-29')
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((s) => s.started_at >= new Date('2026-05-29T00:00:00').getTime())).toBe(true)
  })

  it('getByDate different day: empty array', () => {
    const catId = getCategoryId()
    const ts = new Date('2026-05-29T10:00:00').getTime()
    sessionsCreate({ started_at: ts, ended_at: ts + 1000, duration_minutes: 1, category_id: catId, session_type: 'completed', note: null })
    const result = sessionsGetByDate('2026-05-30')
    expect(result).toHaveLength(0)
  })

  it('updateNote: note updated in DB', () => {
    const catId = getCategoryId()
    const session = sessionsCreate({ started_at: Date.now(), ended_at: Date.now() + 1000, duration_minutes: 1, category_id: catId, session_type: 'completed', note: null })
    sessionsUpdateNote(session.id, 'new note')
    const all = sessionsGetAll()
    const updated = all.find((s) => s.id === session.id)!
    expect(updated.note).toBe('new note')
  })

  it('updateNote null: note cleared', () => {
    const catId = getCategoryId()
    const session = sessionsCreate({ started_at: Date.now(), ended_at: Date.now() + 1000, duration_minutes: 1, category_id: catId, session_type: 'completed', note: 'old' })
    sessionsUpdateNote(session.id, null)
    const all = sessionsGetAll()
    const updated = all.find((s) => s.id === session.id)!
    expect(updated.note).toBeNull()
  })

  it('delete: session gone from getAll', () => {
    const catId = getCategoryId()
    const session = sessionsCreate({ started_at: Date.now(), ended_at: Date.now() + 1000, duration_minutes: 1, category_id: catId, session_type: 'completed', note: null })
    sessionsDelete(session.id)
    const all = sessionsGetAll()
    expect(all.some((s) => s.id === session.id)).toBe(false)
  })
})

// ─── Settings ─────────────────────────────────────────────────────────────────

describe('settings', () => {
  it('get missing key: returns undefined', () => {
    expect(settingsGet('__nonexistent_key__')).toBeUndefined()
  })

  it('get/set boolean true: round-trips', () => {
    settingsSet('test_bool_true', true)
    expect(settingsGet('test_bool_true')).toBe(true)
  })

  it('get/set boolean false: round-trips', () => {
    settingsSet('test_bool_false', false)
    expect(settingsGet('test_bool_false')).toBe(false)
  })

  it('get/set number (42): round-trips', () => {
    settingsSet('test_num', 42)
    expect(settingsGet('test_num')).toBe(42)
  })

  it('get/set string: round-trips', () => {
    settingsSet('test_str', 'hello')
    expect(settingsGet('test_str')).toBe('hello')
  })

  it('get/set object {a:1}: round-trips', () => {
    settingsSet('test_obj', { a: 1 })
    expect(settingsGet('test_obj')).toEqual({ a: 1 })
  })

  it('getAll: returns all settings as parsed-value object', () => {
    const all = settingsGetAll()
    expect(typeof all).toBe('object')
    // Default settings should be seeded
    expect('work_duration' in all).toBe(true)
  })

  it('settingsSet + getAll: new value appears', () => {
    settingsSet('custom_key', 'custom_value')
    const all = settingsGetAll()
    expect(all['custom_key']).toBe('custom_value')
  })
})

// ─── Plugin State ─────────────────────────────────────────────────────────────

describe('plugin state', () => {
  it('pluginSetEnabled(id, true) then pluginGetEnabled(): id appears as true', () => {
    pluginSetEnabled('my-plugin', true)
    const state = pluginGetEnabled()
    expect(state['my-plugin']).toBe(true)
  })

  it('pluginSetEnabled(id, false): appears as false', () => {
    pluginSetEnabled('my-plugin', false)
    const state = pluginGetEnabled()
    expect(state['my-plugin']).toBe(false)
  })
})
