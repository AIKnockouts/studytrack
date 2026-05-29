import React, { useEffect, useRef, useState } from 'react'
import { useSettingsStore } from '../stores/settingsStore'
import { useTimerStore } from '../stores/timerStore'
import CircularCountdown from '../components/Timer/CircularCountdown'
import SubjectDropdown from '../components/Timer/SubjectDropdown'
import NoteField from '../components/Timer/NoteField'
import { SessionPhase } from '../../shared/types'

// ---- helpers ----------------------------------------------------------------

const PHASE_LABELS: Record<SessionPhase, string> = {
  work: 'Work Session',
  short_break: 'Short Break',
  long_break: 'Long Break',
}

const NEXT_PHASE_LABELS: Record<SessionPhase, string> = {
  work: 'Start Break',
  short_break: 'Start Work',
  long_break: 'Start Work',
}

// ---- component --------------------------------------------------------------

const TimerView: React.FC = () => {
  // stores
  const settings = useSettingsStore()
  const timer = useTimerStore()

  // local UI state
  const [noteText, setNoteText] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // load settings on mount
  useEffect(() => {
    settings.load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // tick interval — managed by timer state
  useEffect(() => {
    if (timer.state === 'running') {
      intervalRef.current = setInterval(() => {
        useTimerStore.getState().tick()
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [timer.state])

  // auto-start break after a completed work session
  useEffect(() => {
    if (
      timer.state === 'completed' &&
      timer.phase === 'work' &&
      settings.auto_start_break
    ) {
      // small delay so the completed state is briefly visible
      const t = setTimeout(() => {
        const store = useTimerStore.getState()
        store.nextPhase(useSettingsStore.getState())
        if (store.selectedCategoryId) {
          useTimerStore.getState().start(store.selectedCategoryId)
        }
      }, 800)
      return () => clearTimeout(t)
    }
  }, [timer.state, timer.phase, settings.auto_start_break])

  // auto-start next work session after a break
  useEffect(() => {
    if (
      timer.state === 'completed' &&
      (timer.phase === 'short_break' || timer.phase === 'long_break') &&
      settings.auto_start_next_work
    ) {
      const t = setTimeout(() => {
        const store = useTimerStore.getState()
        store.nextPhase(useSettingsStore.getState())
        if (store.selectedCategoryId) {
          useTimerStore.getState().start(store.selectedCategoryId)
        }
      }, 800)
      return () => clearTimeout(t)
    }
  }, [timer.state, timer.phase, settings.auto_start_next_work])

  // sync totalSeconds when settings change and timer is idle
  useEffect(() => {
    if (timer.state === 'idle') {
      let secs: number
      if (timer.phase === 'work') secs = settings.work_duration * 60
      else if (timer.phase === 'short_break') secs = settings.short_break_duration * 60
      else secs = settings.long_break_duration * 60
      timer.setTotalSeconds(secs)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.work_duration, settings.short_break_duration, settings.long_break_duration, timer.phase])

  // helpers
  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const handleStart = () => {
    if (!timer.selectedCategoryId) return
    timer.start(timer.selectedCategoryId)
  }

  const handleStop = () => {
    const confirmed = window.confirm('Abandon this session?')
    if (!confirmed) return
    timer.stop(settings.partial_threshold)
  }

  const handleSubjectChange = (id: string) => {
    useTimerStore.setState({ selectedCategoryId: id })
  }

  const handleNoteSave = async () => {
    if (!timer.lastSessionId) {
      timer.reset()
      return
    }
    timer.setNote(noteText)
    await window.api.sessions.updateNote(timer.lastSessionId, noteText)
    const mins = Math.round(timer.totalSeconds / 60)
    showToast(`+${mins} min logged`)
    setNoteText('')
    setTimeout(() => {
      timer.reset()
    }, 2000)
  }

  const handleNoteSkip = () => {
    setNoteText('')
    timer.reset()
  }

  const handleNextPhase = () => {
    timer.nextPhase(settings)
  }

  // derived
  const showNoteSection =
    (timer.state === 'completed' || timer.state === 'abandoned') &&
    timer.lastSessionId !== null

  const showNextPhaseButton =
    timer.state === 'completed' && !showNoteSection

  const isDropdownDisabled =
    timer.state === 'running' || timer.state === 'paused'

  // ---- render ----------------------------------------------------------------
  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gray-50 dark:bg-gray-900 px-4 py-8">
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2 rounded-full bg-indigo-600 text-white text-sm font-medium shadow-lg pointer-events-none"
          role="status"
          aria-live="polite"
        >
          {toast}
        </div>
      )}

      <div className="w-full max-w-sm flex flex-col gap-6">
        {/* Phase indicator */}
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">
            {PHASE_LABELS[timer.phase]}
          </p>
          {timer.phase === 'work' && (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Session {timer.workSessionsCompleted + 1}
            </p>
          )}
        </div>

        {/* Circular countdown */}
        <div
          className="w-64 h-64 mx-auto text-gray-800 dark:text-gray-100"
          style={{ color: undefined }}
        >
          <CircularCountdown
            elapsed={timer.elapsed}
            totalSeconds={timer.totalSeconds}
            state={timer.state}
            phase={timer.phase}
            accentColor={settings.accent_color}
          />
        </div>

        {/* Subject dropdown */}
        <SubjectDropdown
          value={timer.selectedCategoryId}
          onChange={handleSubjectChange}
          disabled={isDropdownDisabled}
        />

        {/* Control buttons */}
        <div className="flex gap-3">
          {timer.state === 'idle' && (
            <div className="relative flex-1 group">
              <button
                onClick={handleStart}
                disabled={!timer.selectedCategoryId}
                className={[
                  'w-full px-4 py-3 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
                  timer.selectedCategoryId
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'bg-indigo-300 dark:bg-indigo-800 text-white cursor-not-allowed',
                ]
                  .join(' ')
                  .trim()}
              >
                Start
              </button>
              {!timer.selectedCategoryId && (
                <span className="absolute -top-9 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-gray-800 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  Select a subject first
                </span>
              )}
            </div>
          )}

          {timer.state === 'running' && (
            <>
              <button
                onClick={() => timer.pause()}
                className="flex-1 px-4 py-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
              >
                Pause
              </button>
              <button
                onClick={handleStop}
                className="px-4 py-3 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
              >
                Stop
              </button>
            </>
          )}

          {timer.state === 'paused' && (
            <>
              <button
                onClick={() => timer.resume()}
                className="flex-1 px-4 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Resume
              </button>
              <button
                onClick={handleStop}
                className="px-4 py-3 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
              >
                Stop
              </button>
            </>
          )}

          {showNextPhaseButton && (
            <button
              onClick={handleNextPhase}
              className="flex-1 px-4 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              {NEXT_PHASE_LABELS[timer.phase]}
            </button>
          )}
        </div>

        {/* Note section — shown after completed or abandoned (with a saved session) */}
        {showNoteSection && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex flex-col gap-3 shadow-sm">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {timer.state === 'completed' ? 'Session complete!' : 'Session logged.'}{' '}
              <span className="font-normal text-gray-500 dark:text-gray-400">
                Add a note?
              </span>
            </p>
            <NoteField
              value={noteText}
              onChange={setNoteText}
              onSave={handleNoteSave}
              onSkip={handleNoteSkip}
            />
          </div>
        )}

        {/* Completed — show next phase once note is dismissed */}
        {timer.state === 'completed' && !showNoteSection && (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Great work! Ready for the next phase.
          </p>
        )}
      </div>
    </div>
  )
}

export default TimerView
