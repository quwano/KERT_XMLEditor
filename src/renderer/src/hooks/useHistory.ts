import { useState, useCallback } from 'react'

/** Maximum number of undo/redo steps retained in memory. */
const MAX_STEPS = 100

interface HistoryState<T> {
  past: T[]
  present: T
  future: T[]
}

/**
 * Generic undo/redo history hook (past / present / future pattern).
 * Each call to `set` creates one undoable step.
 * `reset` replaces the entire history (use when loading a new file).
 */
export function useHistory<T>(initial: T) {
  const [state, setState] = useState<HistoryState<T>>({
    past: [],
    present: initial,
    future: []
  })

  /** Push a new state, clearing the redo stack. */
  const set = useCallback((next: T) => {
    setState(s => ({
      past: [...s.past, s.present].slice(-MAX_STEPS),
      present: next,
      future: []
    }))
  }, [])

  /** Replace the entire history with a single new state (e.g., file open / new). */
  const reset = useCallback((next: T) => {
    setState({ past: [], present: next, future: [] })
  }, [])

  const undo = useCallback(() => {
    setState(s => {
      if (s.past.length === 0) return s
      return {
        past: s.past.slice(0, -1),
        present: s.past[s.past.length - 1],
        future: [s.present, ...s.future].slice(0, MAX_STEPS)
      }
    })
  }, [])

  const redo = useCallback(() => {
    setState(s => {
      if (s.future.length === 0) return s
      return {
        past: [...s.past, s.present].slice(-MAX_STEPS),
        present: s.future[0],
        future: s.future.slice(1)
      }
    })
  }, [])

  return {
    value: state.present,
    set,
    reset,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0
  }
}
