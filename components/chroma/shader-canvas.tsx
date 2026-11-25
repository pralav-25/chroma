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
  const requestDraw = useRef<(() => void) | null>(null);
  const elapsed = useRef(0);
  const [error, setError] = useState(false);
  useEffect(() => {
    latest.current = { design, playing };
    requestDraw.current?.();
  }, [design, playing]);
  useImperativeHandle(ref, () => ({ getTime: () => elapsed.current }), []);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: ReturnType<typeof createRenderer> | undefined;
    let raf: number | null = null;
    let last = 0;
    let width = 0;
    let height = 0;

    function scheduleDraw() {
      if (!renderer || document.hidden || width <= 0 || height <= 0) {
        if (raf !== null) cancelAnimationFrame(raf);
        raf = null;
        return;
      }
      if (raf === null) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    }

    const resize = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      width = rect.width * dpr;
      height = rect.height * dpr;
      scheduleDraw();
    });
    resize.observe(canvas);
    function frame(now: number) {
      raf = null;
      if (!renderer || document.hidden) return;
      const { design, playing } = latest.current;
      const animating = playing && design.speed > 0;
      if (animating) {
        const seconds = Math.max(0, Math.min((now - last) / 1000, 0.05));
        elapsed.current += seconds * (design.speed / 35);
      }
      renderer.draw(design, elapsed.current, width, height);
      if (animating) {
        last = now;
        raf = requestAnimationFrame(frame);
      }
    }
    function start() {
      try {
        renderer = createRenderer(canvas!);
        setError(false);
        scheduleDraw();
      } catch {
        setError(true);
      }
    }
    function lost(event: Event) {
      event.preventDefault();
      renderer = undefined;
      scheduleDraw();
      setError(true);
    }
    function restored() {
      start();
    }
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", restored);
    document.addEventListener("visibilitychange", scheduleDraw);
    requestDraw.current = scheduleDraw;
    start();
    return () => {
      requestDraw.current = null;
      if (raf !== null) cancelAnimationFrame(raf);
      resize.disconnect();
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", restored);
      document.removeEventListener("visibilitychange", scheduleDraw);
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
