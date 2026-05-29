import { create } from 'zustand'
import { TimerState, SessionPhase, Settings } from '../../shared/types'

interface TimerStore {
  phase: SessionPhase
  state: TimerState
  elapsed: number
  totalSeconds: number
  workSessionsCompleted: number
  selectedCategoryId: string | null
  startedAt: number | null
  currentNote: string | null
  lastSessionId: string | null

  start: (categoryId: string) => void
  pause: () => void
  resume: () => void
  tick: () => void
  stop: (partialThreshold: number) => void
  setNote: (note: string) => void
  reset: () => void
  setTotalSeconds: (secs: number) => void
  nextPhase: (settings: Settings) => void
  _handleComplete: () => void
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  phase: 'work',
  state: 'idle',
  elapsed: 0,
  totalSeconds: 25 * 60,
  workSessionsCompleted: 0,
  selectedCategoryId: null,
  startedAt: null,
  currentNote: null,
  lastSessionId: null,

  start: (categoryId: string) => {
    set({
      startedAt: Date.now(),
      state: 'running',
      selectedCategoryId: categoryId,
    })
  },

  pause: () => {
    set({ state: 'paused' })
  },

  resume: () => {
    set({ state: 'running' })
  },

  tick: () => {
    const { state, elapsed, totalSeconds } = get()
    if (state !== 'running') return
    const newElapsed = elapsed + 1
    if (newElapsed >= totalSeconds) {
      set({ elapsed: newElapsed })
      get()._handleComplete()
    } else {
      set({ elapsed: newElapsed })
    }
  },

  stop: (partialThreshold: number) => {
    const { state, elapsed, totalSeconds, selectedCategoryId, startedAt, currentNote } = get()
    if (state !== 'running' && state !== 'paused') return

    const pct = (elapsed / totalSeconds) * 100
    if (pct >= partialThreshold && selectedCategoryId && startedAt) {
      window.api.sessions
        .create({
          started_at: startedAt,
          ended_at: Date.now(),
          duration_minutes: elapsed / 60,
          category_id: selectedCategoryId,
          session_type: 'partial',
          note: currentNote,
        })
        .then((response) => {
          if (response.data?.id) {
            set({ lastSessionId: response.data.id })
          }
        })
    }

    set({ state: 'abandoned', elapsed: 0, startedAt: null })
  },

  setNote: (note: string) => {
    set({ currentNote: note })
  },

  reset: () => {
    set({
      state: 'idle',
      elapsed: 0,
      startedAt: null,
      currentNote: null,
      lastSessionId: null,
    })
  },

  setTotalSeconds: (secs: number) => {
    set({ totalSeconds: secs })
  },

  nextPhase: (settings: Settings) => {
    const { phase, workSessionsCompleted } = get()
    let newPhase: SessionPhase

    if (phase === 'work') {
      if (
        workSessionsCompleted > 0 &&
        workSessionsCompleted % settings.sessions_before_long_break === 0
      ) {
        newPhase = 'long_break'
      } else {
        newPhase = 'short_break'
      }
    } else {
      newPhase = 'work'
    }

    let newTotalSeconds: number
    if (newPhase === 'work') {
      newTotalSeconds = settings.work_duration * 60
    } else if (newPhase === 'short_break') {
      newTotalSeconds = settings.short_break_duration * 60
    } else {
      newTotalSeconds = settings.long_break_duration * 60
    }

    set({
      phase: newPhase,
      totalSeconds: newTotalSeconds,
      elapsed: 0,
      state: 'idle',
      startedAt: null,
    })
  },

  _handleComplete: () => {
    const { selectedCategoryId, startedAt, totalSeconds, phase, workSessionsCompleted, currentNote } =
      get()

    if (selectedCategoryId && startedAt) {
      window.api.sessions
        .create({
          started_at: startedAt,
          ended_at: Date.now(),
          duration_minutes: totalSeconds / 60,
          category_id: selectedCategoryId,
          session_type: 'completed',
          note: currentNote,
        })
        .then((response) => {
          if (response.data?.id) {
            set({ lastSessionId: response.data.id })
          }
        })
    }

    if (phase === 'work') {
      set({ workSessionsCompleted: workSessionsCompleted + 1 })
    }

    set({ state: 'completed' })
  },
}))
