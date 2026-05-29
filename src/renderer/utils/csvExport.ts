import type { Session, Category } from '../../shared/types'

function escapeCsvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

export function buildCsvString(sessions: Session[], categories: Category[]): string {
  const categoryMap = new Map<string, Category>(categories.map((c) => [c.id, c]))

  const header = [
    escapeCsvField('date'),
    escapeCsvField('subject'),
    escapeCsvField('duration_minutes'),
    escapeCsvField('session_type'),
    escapeCsvField('note'),
  ].join(',')

  const rows = sessions.map((session) => {
    const date = new Date(session.started_at).toISOString()
    const subject = categoryMap.get(session.category_id)?.name ?? session.category_id
    const duration = String(session.duration_minutes)
    const sessionType = session.session_type
    const note = session.note ?? ''

    return [
      escapeCsvField(date),
      escapeCsvField(subject),
      escapeCsvField(duration),
      escapeCsvField(sessionType),
      escapeCsvField(note),
    ].join(',')
  })

  return [header, ...rows].join('\n')
}

export function exportSessionsToCsv(sessions: Session[], categories: Category[]): void {
  const csv = buildCsvString(sessions, categories)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'studytrack-sessions.csv'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
