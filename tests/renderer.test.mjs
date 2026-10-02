import test from "node:test";
import assert from "node:assert/strict";
import { createRenderer, exportImage } from "../lib/chroma/renderer.ts";
import { initialDesign } from "../lib/chroma/design.ts";

// Exercise GPU limits and resource ownership without depending on a host GPU.
function device(limit = 4096, failFragment = false) {
  const calls = { lost: 0, shaders: 0, encoded: null };
  const gl = new Proxy({
    MAX_TEXTURE_SIZE: 1, MAX_RENDERBUFFER_SIZE: 2, MAX_VIEWPORT_DIMS: 3,
    VERTEX_SHADER: 4, FRAGMENT_SHADER: 5, COMPILE_STATUS: 6, LINK_STATUS: 7,
    createShader: (type) => ({ type }),
    getShaderParameter: (shader) => !(failFragment && shader.type === 5),
    getShaderInfoLog: () => "Fragment compilation failed",
    deleteShader: () => { calls.shaders++; },
    createProgram: () => ({}),
    getProgramParameter: () => true,
    createBuffer: () => ({}),
    getAttribLocation: () => 0,
    getUniformLocation: () => ({}),
    getParameter: (key) => key === 3 ? new Int32Array([limit, limit]) : limit,
    getExtension: () => ({ loseContext: () => { calls.lost++; } }),
  }, { get: (target, key) => target[key] ?? (() => {}) });
  const canvas = {
    width: 1, height: 1,
    getContext: () => gl,
    toBlob: (callback) => {
      calls.encoded = [canvas.width, canvas.height];
      callback(new Blob(["png"], { type: "image/png" }));
    },
  };
  return { canvas, calls };
}

test("limited GPUs reject 4K export instead of distorting or mislabeling it", async () => {
  const { canvas, calls } = device(2048);
  globalThis.document = { createElement: () => canvas };
  try {
    await assert.rejects(exportImage(initialDesign, 0, 3840, 2400), /lower resolution/);
    assert.equal(calls.encoded, null);
    assert.equal(calls.lost, 1);
  } finally { delete globalThis.document; }
});

test("supported exports encode exactly the requested dimensions", async () => {
  const { canvas, calls } = device();
  globalThis.document = { createElement: () => canvas };
  try {
    const blob = await exportImage(initialDesign, 0, 3840, 2400);
    assert.equal(blob.type, "image/png");
    assert.deepEqual(calls.encoded, [3840, 2400]);
    assert.equal(calls.lost, 1);
  } finally { delete globalThis.document; }
});

test("disposing a persistent canvas permits remounting on the same context", () => {
  const { canvas, calls } = device();
  const renderer = createRenderer(canvas);
  renderer.dispose();
  assert.equal(calls.lost, 0);
  const remounted = createRenderer(canvas);
  remounted.draw(initialDesign, 0, 1000, 625);
  assert.deepEqual([canvas.width, canvas.height], [1000, 625]);
  remounted.dispose();
});

test("shader initialization failures release the allocated GPU context", () => {
  const { canvas, calls } = device(4096, true);
  assert.throws(() => createRenderer(canvas), /Fragment compilation failed/);
  assert.ok(calls.shaders >= 2);
  assert.equal(calls.lost, 1);
});
