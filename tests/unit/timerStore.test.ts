import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTimerStore } from '../../src/renderer/stores/timerStore'
import type { Settings } from '../../src/shared/types'

// Mock window.api before importing the store
vi.stubGlobal('window', {
  api: {
    sessions: {
      create: vi.fn().mockResolvedValue({
        data: {
          id: 'sess-1',
          duration_minutes: 25,
          session_type: 'completed',
          started_at: 0,
          ended_at: 0,
          category_id: 'cat1',
          note: null,
          created_at: 0,
        },
      }),
      updateNote: vi.fn().mockResolvedValue({ data: true }),
    },
    settings: {
      getAll: vi.fn().mockResolvedValue({
        data: {
          partial_threshold: 50,
          work_duration: 25,
          short_break_duration: 5,
          long_break_duration: 15,
          sessions_before_long_break: 4,
          notification_on_complete: false,
          sound_on_complete: false,
        },
      }),
      get: vi.fn().mockResolvedValue({ data: null }),
    },
  },
})

const defaultSettings: Settings = {
  work_duration: 25,
  short_break_duration: 5,
  long_break_duration: 15,
  sessions_before_long_break: 4,
  sound_on_complete: false,
  notification_on_complete: false,
  auto_start_break: false,
  auto_start_next_work: false,
  theme: 'system',
  accent_color: '#6366f1',
  partial_threshold: 50,
  data_dir: '',
}

function resetStore() {
  useTimerStore.setState({
    phase: 'work',
    state: 'idle',
    elapsed: 0,
    totalSeconds: 25 * 60,
    workSessionsCompleted: 0,
    selectedCategoryId: null,
    startedAt: null,
    currentNote: null,
    lastSessionId: null,
  })
}

beforeEach(() => {
  resetStore()
  vi.clearAllMocks()
  // Reset mock to always return success
  ;(window as any).api.sessions.create.mockResolvedValue({
    data: {
      id: 'sess-1',
      duration_minutes: 25,
      session_type: 'completed',
      started_at: 0,
      ended_at: 0,
      category_id: 'cat1',
      note: null,
      created_at: 0,
    },
  })
})

describe('timerStore', () => {
  it('initial state: state=idle, elapsed=0, phase=work', () => {
    const { state, elapsed, phase } = useTimerStore.getState()
    expect(state).toBe('idle')
    expect(elapsed).toBe(0)
    expect(phase).toBe('work')
  })

  it('start(): state changes to "running"', () => {
    useTimerStore.getState().start('cat1')
    expect(useTimerStore.getState().state).toBe('running')
  })

  it('tick() while running: elapsed increments', () => {
    useTimerStore.getState().start('cat1')
    useTimerStore.getState().tick()
    expect(useTimerStore.getState().elapsed).toBe(1)
    useTimerStore.getState().tick()
    expect(useTimerStore.getState().elapsed).toBe(2)
  })

  it('pause(): state becomes "paused"', () => {
    useTimerStore.getState().start('cat1')
    useTimerStore.getState().pause()
    expect(useTimerStore.getState().state).toBe('paused')
  })

  it('tick() while paused: elapsed does NOT change', () => {
    useTimerStore.getState().start('cat1')
    useTimerStore.getState().tick()
    expect(useTimerStore.getState().elapsed).toBe(1)
    useTimerStore.getState().pause()
    useTimerStore.getState().tick()
    expect(useTimerStore.getState().elapsed).toBe(1)
  })

  it('resume(): state becomes "running"', () => {
    useTimerStore.getState().start('cat1')
    useTimerStore.getState().pause()
    useTimerStore.getState().resume()
    expect(useTimerStore.getState().state).toBe('running')
  })

  it('elapsed preserved through pause+resume', () => {
    useTimerStore.getState().start('cat1')
    useTimerStore.getState().tick()
    useTimerStore.getState().tick()
    useTimerStore.getState().tick()
    useTimerStore.getState().pause()
    useTimerStore.getState().resume()
    expect(useTimerStore.getState().elapsed).toBe(3)
  })

  it('tick() to totalSeconds: sessions.create called with session_type="completed"', async () => {
    const totalSeconds = 5
    useTimerStore.setState({ totalSeconds, startedAt: Date.now(), selectedCategoryId: 'cat1', state: 'running' })
    // Tick to totalSeconds
    for (let i = 0; i < totalSeconds; i++) {
      useTimerStore.getState().tick()
    }
    // Wait for async promise to resolve
    await new Promise((r) => setTimeout(r, 0))
    expect((window as any).api.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ session_type: 'completed' })
    )
  })

  it('stop() at 0 elapsed: sessions.create NOT called', () => {
    useTimerStore.getState().start('cat1')
    useTimerStore.getState().stop(50)
    expect((window as any).api.sessions.create).not.toHaveBeenCalled()
  })

  it('stop() at just-under-50% (elapsed = floor(totalSeconds * 0.49)): NOT called', () => {
    const totalSeconds = 25 * 60
    const elapsed = Math.floor(totalSeconds * 0.49)
    useTimerStore.setState({ state: 'running', totalSeconds, elapsed, selectedCategoryId: 'cat1', startedAt: Date.now() })
    useTimerStore.getState().stop(50)
    expect((window as any).api.sessions.create).not.toHaveBeenCalled()
  })

  it('stop() at exactly 50% (elapsed = floor(totalSeconds * 0.5)): called with "partial"', async () => {
    const totalSeconds = 25 * 60
    const elapsed = Math.floor(totalSeconds * 0.5)
    useTimerStore.setState({ state: 'running', totalSeconds, elapsed, selectedCategoryId: 'cat1', startedAt: Date.now() })
    useTimerStore.getState().stop(50)
    await new Promise((r) => setTimeout(r, 0))
    expect((window as any).api.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ session_type: 'partial' })
    )
  })

  it('stop() at 75%: called with "partial"', async () => {
    const totalSeconds = 25 * 60
    const elapsed = Math.floor(totalSeconds * 0.75)
    useTimerStore.setState({ state: 'running', totalSeconds, elapsed, selectedCategoryId: 'cat1', startedAt: Date.now() })
    useTimerStore.getState().stop(50)
    await new Promise((r) => setTimeout(r, 0))
    expect((window as any).api.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ session_type: 'partial' })
    )
  })

  it('work phase completes: workSessionsCompleted increments', async () => {
    const totalSeconds = 3
    useTimerStore.setState({ totalSeconds, startedAt: Date.now(), selectedCategoryId: 'cat1', state: 'running', phase: 'work', workSessionsCompleted: 0 })
    for (let i = 0; i < totalSeconds; i++) {
      useTimerStore.getState().tick()
    }
    await new Promise((r) => setTimeout(r, 0))
    expect(useTimerStore.getState().workSessionsCompleted).toBe(1)
  })

  it('after 4 work completions, nextPhase gives long_break', () => {
    useTimerStore.setState({ phase: 'work', workSessionsCompleted: 4 })
    useTimerStore.getState().nextPhase(defaultSettings)
    expect(useTimerStore.getState().phase).toBe('long_break')
  })

  it('after 3 work completions, nextPhase gives short_break', () => {
    useTimerStore.setState({ phase: 'work', workSessionsCompleted: 3 })
    useTimerStore.getState().nextPhase(defaultSettings)
    expect(useTimerStore.getState().phase).toBe('short_break')
  })
})
