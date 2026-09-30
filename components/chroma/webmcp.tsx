"use client";
import { useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { presets, type Design } from "@/lib/chroma/design";
type Tool = {
  name: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: unknown) => unknown;
};
type Context = {
  registerTool: (
    tool: Tool,
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
export function useStudioTools(
  design: Design,
  apply: (design: Design) => void,
) {
  const current = useRef({ design, apply });
  useEffect(() => {
    current.current = { design, apply };
  }, [design, apply]);
  useEffect(() => {
    const context = (document as Document & { modelContext?: Context })
      .modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: Tool) => {
      try {
        void Promise.resolve(
          context.registerTool(tool, { signal: lifecycle.signal }),
        ).catch(() => {});
      } catch {
        /* Optional API; the studio remains fully usable. */
      }
    };
    register({
      name: "list_chroma_presets",
      description:
        "List the built-in CHROMA shader presets without changing the canvas.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: () =>
        presets.map((p) => ({ id: p.id, name: p.name, effect: p.effect })),
    });
    register({
      name: "get_chroma_design",
      description: "Read the current CHROMA design settings.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: () => current.current.design,
    });
    register({
      name: "apply_chroma_preset",
      description:
        "Apply a built-in preset to the visible CHROMA canvas. This changes the current design and can be undone.",
      inputSchema: {
        type: "object",
        properties: {
          presetId: { type: "string", enum: presets.map((p) => p.id) },
        },
        required: ["presetId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) => {
        if (
          !input ||
          typeof input !== "object" ||
          Object.keys(input).some((k) => k !== "presetId")
        )
          throw new Error("Expected a presetId only.");
        const preset = presets.find(
          (p) => p.id === (input as { presetId?: unknown }).presetId,
        );
        if (!preset) throw new Error("Unknown presetId.");
        flushSync(() => current.current.apply({ ...preset }));
        return { applied: true, design: preset };
      },
    });
    return () => lifecycle.abort();
  }, []);
}
