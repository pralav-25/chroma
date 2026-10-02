"use client";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { Design } from "@/lib/chroma/design";
import { createRenderer } from "@/lib/chroma/renderer";
export type ShaderHandle = { getTime: () => number };
export const ShaderCanvas = forwardRef<
  ShaderHandle,
  { design: Design; playing: boolean }
>(({ design, playing }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const latest = useRef({ design, playing });
  const elapsed = useRef(0);
  const [error, setError] = useState(false);
  useEffect(() => {
    latest.current = { design, playing };
  }, [design, playing]);
  useImperativeHandle(ref, () => ({ getTime: () => elapsed.current }), []);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: ReturnType<typeof createRenderer> | undefined;
    let raf = 0,
      last = 0,
      dirty = true,
      width = 1,
      height = 1;
    const resize = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      width = rect.width * dpr;
      height = rect.height * dpr;
      dirty = true;
    });
    resize.observe(canvas);
    let previous: Design | undefined;
    function frame(now: number) {
      const { design: d, playing: p } = latest.current;
      if (p && !document.hidden)
        elapsed.current += Math.min((now - last) / 1000, 0.05) * (d.speed / 35);
      if (renderer && !document.hidden && (p || dirty || previous !== d)) {
        renderer.draw(d, elapsed.current, width, height);
        dirty = false;
        previous = d;
      }
      last = now;
      raf = requestAnimationFrame(frame);
    }
    function start() {
      try {
        renderer = createRenderer(canvas!);
        setError(false);
        dirty = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      } catch {
        setError(true);
      }
    }
    function lost(event: Event) {
      event.preventDefault();
      cancelAnimationFrame(raf);
      setError(true);
    }
    function restored() {
      start();
    }
    function visible() {
      dirty = true;
      last = performance.now();
    }
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", restored);
    document.addEventListener("visibilitychange", visible);
    start();
    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", restored);
      document.removeEventListener("visibilitychange", visible);
      renderer?.dispose();
    };
  }, []);
  return (
    <>
      <canvas
        ref={canvasRef}
        className="shader-canvas"
        aria-label={`${design.name}: animated ${design.effect} composition`}
        role="img"
      />
      {error && (
        <div className="canvas-error">
          <strong>Your graphics renderer is unavailable</strong>
          <span>
            Try another browser or enable hardware acceleration. Your settings
            are safe.
          </span>
        </div>
      )}
    </>
  );
});
ShaderCanvas.displayName = "ShaderCanvas";
