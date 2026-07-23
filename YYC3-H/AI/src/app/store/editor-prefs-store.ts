/**
 * YYC3 Editor Preferences Store — Shared reactive store for Monaco options
 * @description Bridges SettingsPanel <-> CyberEditor via useSyncExternalStore.
 *   Persists to localStorage under 'yyc3_editor_prefs'.
 * @version 4.8.0
 */

import { useSyncExternalStore } from 'react'

/** Editor preference values synced to Monaco options */
export interface EditorPrefs {
  fontSize: number
  tabSize: number
  wordWrap: boolean
  minimap: boolean
  lineNumbers: boolean
  bracketPairs: boolean
  autoSave: boolean
}

const LS_KEY = 'yyc3_editor_prefs'

const DEFAULTS: EditorPrefs = {
  fontSize: 13,
  tabSize: 2,
  wordWrap: false,
  minimap: true,
  lineNumbers: true,
  bracketPairs: true,
  autoSave: true,
}

function load(): EditorPrefs {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return { ...DEFAULTS }
}

function persist(prefs: EditorPrefs) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(prefs)) } catch { /* ignore */ }
}

// ===== State =====
let state: EditorPrefs = load()

type Listener = () => void
const listeners = new Set<Listener>()

function emitChange() {
  for (const l of listeners) l()
}
function subscribe(l: Listener) {
  listeners.add(l)
  return () => listeners.delete(l)
}
function getSnapshot() {
  return state
}

// ===== Actions =====
const actions = {
  /** Update a single preference key */
  set<K extends keyof EditorPrefs>(key: K, value: EditorPrefs[K]) {
    state = { ...state, [key]: value }
    persist(state)
    emitChange()
  },
  /** Bulk update */
  update(patch: Partial<EditorPrefs>) {
    state = { ...state, ...patch }
    persist(state)
    emitChange()
  },
  /** Reset all to defaults */
  reset() {
    state = { ...DEFAULTS }
    persist(state)
    emitChange()
  },
}

// ===== React Hook =====
export function useEditorPrefs() {
  const prefs = useSyncExternalStore(subscribe, getSnapshot)
  return { prefs, ...actions }
}

/** Imperative access outside React */
export const editorPrefsStore = {
  getState: getSnapshot,
  ...actions,
}
