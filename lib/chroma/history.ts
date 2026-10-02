import type { Design } from "./design";
export type History = {
  past: Design[];
  present: Design;
  future: Design[];
  origin: Design | null;
};
export type HistoryAction =
  | { type: "update" | "preview"; design: Design }
  | { type: "undo" | "redo" | "commit" }
  | { type: "restore"; design: Design };
const equal = (a: Design, b: Design) => JSON.stringify(a) === JSON.stringify(b);
export function historyReducer(state: History, action: HistoryAction): History {
  if (action.type === "restore")
    return { past: [], present: action.design, future: [], origin: null };
  if (action.type === "preview")
    return {
      ...state,
      origin: state.origin ?? state.present,
      present: action.design,
    };
  if (action.type === "commit") {
    if (!state.origin) return state;
    return {
      ...state,
      past: equal(state.origin, state.present)
        ? state.past
        : [...state.past, state.origin].slice(-50),
      future: equal(state.origin, state.present) ? state.future : [],
      origin: null,
    };
  }
  if (action.type === "update") {
    if (equal(action.design, state.present)) return state;
    return {
      past: [...state.past, state.origin ?? state.present].slice(-50),
      present: action.design,
      future: [],
      origin: null,
    };
  }
  if (action.type === "undo") {
    if (state.origin) {
      if (equal(state.origin, state.present))
        return { ...state, origin: null };
      return {
        ...state,
        present: state.origin,
        future: [state.present],
        origin: null,
      };
    }
    if (!state.past.length) return state;
    return {
      past: state.past.slice(0, -1),
      present: state.past[state.past.length - 1],
      future: [state.present, ...state.future],
      origin: null,
    };
  }
  if (!state.future.length) return state;
  return {
    past: [...state.past, state.present].slice(-50),
    present: state.future[0],
    future: state.future.slice(1),
    origin: null,
  };
}
