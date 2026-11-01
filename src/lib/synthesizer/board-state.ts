import { UNGROUPED_LABEL } from "@/lib/synthesizer/constants";

export type BoardTheme = { id: string; title: string; notes: string };
export type Placement = { themeId: string | null; position: number };
export type BoardState = { themes: BoardTheme[]; cards: Record<string, Placement> };

export { UNGROUPED_LABEL };

/** Cards in a column (theme id, or null for "not grouped"), in order. */
export function columnCards(state: BoardState, themeId: string | null): string[] {
  return Object.entries(state.cards)
    .filter(([, p]) => p.themeId === themeId)
    .sort(([ia, a], [ib, b]) => a.position - b.position || ia.localeCompare(ib))
    .map(([id]) => id);
}

/** Re-numbers every column 0..n-1 so positions never collide or leave gaps. */
function normalise(state: BoardState): BoardState {
  const cards: Record<string, Placement> = {};
  for (const themeId of [null, ...state.themes.map((t) => t.id)]) {
    columnCards(state, themeId).forEach((id, position) => { cards[id] = { themeId, position }; });
  }
  return { ...state, cards };
}

export function addTheme(state: BoardState, id: string, title: string): BoardState {
  return { ...state, themes: [...state.themes, { id, title: title.trim(), notes: "" }] };
}

export function renameTheme(state: BoardState, id: string, title: string): BoardState {
  const next = title.trim();
  if (!next) return state;
  return { ...state, themes: state.themes.map((t) => (t.id === id ? { ...t, title: next } : t)) };
}

export function setThemeNotes(state: BoardState, id: string, notes: string): BoardState {
  return { ...state, themes: state.themes.map((t) => (t.id === id ? { ...t, notes } : t)) };
}

/** Removing a theme never removes evidence: its cards go back to "not grouped". */
export function removeTheme(state: BoardState, id: string): BoardState {
  const tail = columnCards(state, null).length;
  const cards = { ...state.cards };
  columnCards(state, id).forEach((cardId, i) => { cards[cardId] = { themeId: null, position: tail + i }; });
  return normalise({ themes: state.themes.filter((t) => t.id !== id), cards });
}

export function moveTheme(state: BoardState, id: string, direction: -1 | 1): BoardState {
  const from = state.themes.findIndex((t) => t.id === id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= state.themes.length) return state;
  const themes = [...state.themes];
  [themes[from], themes[to]] = [themes[to], themes[from]];
  return { ...state, themes };
}

/** Moves a card to a column at an index (default: the end). Works within a column too. */
export function moveCard(state: BoardState, cardId: string, themeId: string | null, index?: number): BoardState {
  if (!state.cards[cardId]) return state;
  if (themeId !== null && !state.themes.some((t) => t.id === themeId)) return state;
  const target = columnCards(state, themeId).filter((id) => id !== cardId);
  const at = index === undefined ? target.length : Math.max(0, Math.min(index, target.length));
  target.splice(at, 0, cardId);
  const cards = { ...state.cards };
  target.forEach((id, position) => { cards[id] = { themeId, position }; });
  return normalise({ ...state, cards });
}

export function addCard(state: BoardState, cardId: string): BoardState {
  if (state.cards[cardId]) return state;
  return normalise({ ...state, cards: { ...state.cards, [cardId]: { themeId: null, position: Number.MAX_SAFE_INTEGER } } });
}

export function removeCard(state: BoardState, cardId: string): BoardState {
  if (!state.cards[cardId]) return state;
  const cards = { ...state.cards };
  delete cards[cardId];
  return normalise({ ...state, cards });
}

export const sameState = (a: BoardState, b: BoardState) => JSON.stringify(a) === JSON.stringify(b);

/** The shape the server stores: positions come from order, so they are always valid. */
export function toLayout(state: BoardState) {
  const n = normalise(state);
  return {
    themes: n.themes.map((t) => ({ id: t.id, title: t.title, notes: t.notes })),
    cards: Object.entries(n.cards).map(([id, p]) => ({ id, themeId: p.themeId, position: p.position })),
  };
}

/** Undo and redo for board operations: snapshots of the whole layout. */
export type History = { past: BoardState[]; present: BoardState; future: BoardState[] };
export const HISTORY_LIMIT = 50;

export const createHistory = (present: BoardState): History => ({ past: [], present, future: [] });

export function commit(h: History, next: BoardState): History {
  if (sameState(h.present, next)) return h;
  return { past: [...h.past, h.present].slice(-HISTORY_LIMIT), present: next, future: [] };
}
export const canUndo = (h: History) => h.past.length > 0;
export const canRedo = (h: History) => h.future.length > 0;

export function undo(h: History): History {
  if (!canUndo(h)) return h;
  return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] };
}
export function redo(h: History): History {
  if (!canRedo(h)) return h;
  return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) };
}

/** Applies a change that must not be undoable (a card added or deleted elsewhere) to every snapshot. */
export function applyEverywhere(h: History, fn: (s: BoardState) => BoardState): History {
  return { past: h.past.map(fn), present: fn(h.present), future: h.future.map(fn) };
}
