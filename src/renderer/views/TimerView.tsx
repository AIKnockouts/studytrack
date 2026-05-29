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
    <div className="min-h-screen flex flex-col items-center justify-start bg-[#0a0a0a] px-4 py-10">
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2 rounded-full bg-[var(--accent-color)] text-white text-sm font-medium pointer-events-none"
          role="status"
          aria-live="polite"
        >
          {toast}
        </div>
      )}

      <div className="w-full max-w-sm flex flex-col gap-8">
        {/* Phase indicator */}
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-[#555555] mb-1">
            {PHASE_LABELS[timer.phase]}
          </p>
          {timer.phase === 'work' && (
            <p className="text-xs text-[#555555]">
              Session {timer.workSessionsCompleted + 1}
            </p>
          )}
        </div>

        {/* Circular countdown */}
        <div
          className="w-60 h-60 mx-auto text-[#f5f5f5]"
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
        <div className="flex gap-2">
          {timer.state === 'idle' && (
            <div className="relative flex-1 group">
              <button
                onClick={handleStart}
                disabled={!timer.selectedCategoryId}
                className={[
                  'w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-opacity focus:outline-none',
                  timer.selectedCategoryId
                    ? 'bg-[var(--accent-color)] text-white hover:opacity-90'
                    : 'bg-[#1a1a1a] text-[#555555] cursor-not-allowed',
                ]
                  .join(' ')
                  .trim()}
              >
                Start
              </button>
              {!timer.selectedCategoryId && (
                <span className="absolute -top-9 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg bg-[#1a1a1a] border border-[#222222] text-[#888888] text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  Select a subject first
                </span>
              )}
            </div>
          )}

          {timer.state === 'running' && (
            <>
              <button
                onClick={() => timer.pause()}
                className="flex-1 px-4 py-2.5 rounded-lg bg-transparent border border-[#333333] text-[#f5f5f5] text-sm font-medium hover:bg-[#1a1a1a] transition-colors focus:outline-none"
              >
                Pause
              </button>
              <button
                onClick={handleStop}
                className="px-4 py-2.5 rounded-lg border border-[#333333] text-[#888888] hover:text-red-400 hover:border-red-500/30 text-sm font-medium transition-colors focus:outline-none"
              >
                Stop
              </button>
            </>
          )}

          {timer.state === 'paused' && (
            <>
              <button
                onClick={() => timer.resume()}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--accent-color)] text-white text-sm font-medium hover:opacity-90 transition-opacity focus:outline-none"
              >
                Resume
              </button>
              <button
                onClick={handleStop}
                className="px-4 py-2.5 rounded-lg border border-[#333333] text-[#888888] hover:text-red-400 hover:border-red-500/30 text-sm font-medium transition-colors focus:outline-none"
              >
                Stop
              </button>
            </>
          )}

          {showNextPhaseButton && (
            <button
              onClick={handleNextPhase}
              className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm font-medium hover:bg-emerald-500/20 transition-colors focus:outline-none"
            >
              {NEXT_PHASE_LABELS[timer.phase]}
            </button>
          )}
        </div>

        {/* Note section — shown after completed or abandoned (with a saved session) */}
        {showNoteSection && (
          <div className="rounded-xl border border-[#222222] bg-[#111111] p-4 flex flex-col gap-3">
            <p className="text-sm font-medium text-[#f5f5f5]">
              {timer.state === 'completed' ? 'Session complete!' : 'Session logged.'}{' '}
              <span className="font-normal text-[#888888]">
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
          <p className="text-center text-xs text-[#555555]">
            Great work! Ready for the next phase.
          </p>
        )}
      </div>
    </div>
  )
}

export default TimerView
