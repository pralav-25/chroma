import test from "node:test";
import assert from "node:assert/strict";
import {
  initialDesign,
  presets,
  isDesign,
  designCode,
} from "../lib/chroma/design.ts";
import { historyReducer } from "../lib/chroma/history.ts";
const start = () => ({
  past: [],
  present: { ...initialDesign },
  future: [],
  origin: null,
});
test("every curated preset and a JSON round trip validates", () => {
  for (const p of presets) assert.equal(isDesign(p), true);
  assert.equal(isDesign(JSON.parse(designCode(initialDesign)).design), true);
});
test("hostile and malformed imports are rejected", () => {
  for (const x of [
    null,
    {},
    { ...initialDesign, colors: ["red"] },
    { ...initialDesign, grain: NaN },
    { ...initialDesign, speed: 101 },
    { ...initialDesign, effect: "javascript" },
    { ...initialDesign, name: "a".repeat(81) },
  ])
    assert.equal(isDesign(x), false);
});
test("a complete slider gesture is one undo step", () => {
  let s = start();
  for (let scale = 46; scale < 95; scale++)
    s = historyReducer(s, { type: "preview", design: { ...s.present, scale } });
  assert.equal(s.past.length, 0);
  s = historyReducer(s, { type: "commit" });
  assert.equal(s.past.length, 1);
  assert.equal(s.present.scale, 94);
  s = historyReducer(s, { type: "undo" });
  assert.equal(s.present.scale, 45);
  s = historyReducer(s, { type: "redo" });
  assert.equal(s.present.scale, 94);
});
test("editing after undo invalidates the redo branch", () => {
  let s = historyReducer(start(), { type: "update", design: presets[1] });
  s = historyReducer(s, { type: "undo" });
  s = historyReducer(s, { type: "update", design: presets[2] });
  assert.equal(s.future.length, 0);
  assert.equal(s.present.name, "Blue hour");
});
test("undo cancels an uncommitted color edit", () => {
  let s = historyReducer(start(), {
    type: "preview",
    design: {
      ...initialDesign,
      colors: ["#FFFFFF", ...initialDesign.colors.slice(1)],
    },
  });
  s = historyReducer(s, { type: "undo" });
  assert.deepEqual(s.present.colors, initialDesign.colors);
  assert.equal(s.origin, null);
});
test("history is bounded and no-op edits do not create entries", () => {
  let s = start();
  s = historyReducer(s, { type: "update", design: { ...initialDesign } });
  assert.equal(s.past.length, 0);
  for (let i = 0; i < 100; i++)
    s = historyReducer(s, {
      type: "update",
      design: { ...initialDesign, seed: i },
    });
  assert.equal(s.past.length, 50);
});
test("restoring a draft starts a fresh history", () => {
  let s = historyReducer(start(), { type: "update", design: presets[1] });
  s = historyReducer(s, { type: "restore", design: presets[2] });
  assert.equal(s.past.length, 0);
  assert.equal(s.future.length, 0);
  assert.equal(s.present.name, "Blue hour");
});

test("undo of an in-progress gesture remains redoable", () => {
  let s = historyReducer(start(), {
    type: "preview",
    design: { ...initialDesign, scale: 80 },
  });
  s = historyReducer(s, { type: "undo" });
  assert.equal(s.present.scale, 45);
  s = historyReducer(s, { type: "redo" });
  assert.equal(s.present.scale, 80);
});

test("a gesture returning to its origin preserves the redo branch", () => {
  let s = historyReducer(start(), { type: "update", design: presets[1] });
  s = historyReducer(s, { type: "undo" });
  const original = s.present;
  s = historyReducer(s, { type: "preview", design: { ...original, scale: 80 } });
  s = historyReducer(s, { type: "preview", design: original });
  s = historyReducer(s, { type: "commit" });
  s = historyReducer(s, { type: "redo" });
  assert.equal(s.present.name, "Acid dream");
});

test("undoing a new gesture discards the obsolete redo branch", () => {
  let s = historyReducer(start(), { type: "update", design: presets[1] });
  s = historyReducer(s, { type: "update", design: presets[2] });
  s = historyReducer(s, { type: "undo" });
  s = historyReducer(s, { type: "preview", design: { ...s.present, scale: 80 } });
  s = historyReducer(s, { type: "undo" });
  s = historyReducer(s, { type: "redo" });
  assert.equal(s.present.scale, 80);
  assert.equal(s.future.length, 0);
});
