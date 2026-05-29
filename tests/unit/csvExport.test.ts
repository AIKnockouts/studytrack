import { describe, it, expect } from 'vitest'
import type { Session, Category } from '../../src/shared/types'
import { buildCsvString } from '../../src/renderer/utils/csvExport'

const cat1: Category = {
  id: 'cat1',
  name: 'CS / Coding',
  color: '#6366f1',
  emoji: '💻',
  sort_order: 0,
  archived_at: null,
  created_at: 0,
}
const catComma: Category = {
  id: 'cat2',
  name: 'Math, Advanced',
  color: '#f59e0b',
  emoji: '📐',
  sort_order: 1,
  archived_at: null,
  created_at: 0,
}

function ms(override: Partial<Session> = {}): Session {
  return {
    id: '1',
    started_at: 0,
    ended_at: 1500000,
    duration_minutes: 25,
    category_id: 'cat1',
    session_type: 'completed',
    note: null,
    created_at: 0,
    ...override,
  }
}

describe('buildCsvString', () => {
  it('empty sessions → exactly 1 line (header only)', () => {
    const csv = buildCsvString([], [cat1])
    const lines = csv.split('\n')
    expect(lines).toHaveLength(1)
  })

  it('header is exactly: "date","subject","duration_minutes","session_type","note"', () => {
    const csv = buildCsvString([], [cat1])
    expect(csv).toBe('"date","subject","duration_minutes","session_type","note"')
  })

  it('one session: 2 lines total (header + 1 row)', () => {
    const csv = buildCsvString([ms()], [cat1])
    const lines = csv.split('\n')
    expect(lines).toHaveLength(2)
  })

  it('note=null → empty quoted field ""', () => {
    const csv = buildCsvString([ms({ note: null })], [cat1])
    const lines = csv.split('\n')
    expect(lines[1].endsWith('""')).toBe(true)
  })

  it('note with comma → wrapped in quotes', () => {
    const csv = buildCsvString([ms({ note: 'hello, world' })], [cat1])
    expect(csv).toContain('"hello, world"')
  })

  it('note with double quotes → quotes doubled', () => {
    const csv = buildCsvString([ms({ note: 'said "hello"' })], [cat1])
    expect(csv).toContain('said ""hello""')
  })

  it('note with newline → field is still one quoted value', () => {
    const csv = buildCsvString([ms({ note: 'line1\nline2' })], [cat1])
    // Should be quoted and the whole row is still complete
    expect(csv).toContain('"line1\nline2"')
  })

  it('subject name "Math, Advanced" (from catComma) → wrapped in quotes', () => {
    const csv = buildCsvString([ms({ category_id: 'cat2' })], [cat1, catComma])
    expect(csv).toContain('"Math, Advanced"')
  })

  it('duration_minutes=12.5 → 12.5 in output', () => {
    const csv = buildCsvString([ms({ duration_minutes: 12.5 })], [cat1])
    expect(csv).toContain('12.5')
  })

  it('unknown category_id → falls back to category_id value', () => {
    const csv = buildCsvString([ms({ category_id: 'unknown-id' })], [cat1])
    expect(csv).toContain('unknown-id')
  })

  it('N sessions → N+1 lines', () => {
    const sessions = [ms(), ms({ id: '2' }), ms({ id: '3' })]
    const csv = buildCsvString(sessions, [cat1])
    const lines = csv.split('\n')
    expect(lines).toHaveLength(4)
  })
})
