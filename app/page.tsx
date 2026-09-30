"use client";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  Aperture,
  SlidersHorizontal,
  Shuffle,
  Play,
  Pause,
  Download,
  Bookmark,
  Undo2,
  Redo2,
  Maximize2,
  Minimize2,
  Command as CommandIcon,
  Code2,
  Copy,
  Layers,
  CircleHelp,
  Type,
  RotateCcw,
  Trash2,
  Upload,
  Loader2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { LabeledSlider } from "@/components/chroma/labeled-slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from "@/components/ui/command";
import { Toaster } from "@/components/ui/sonner";
import {
  ShaderCanvas,
  type ShaderHandle,
} from "@/components/chroma/shader-canvas";
import { PresetCard } from "@/components/chroma/preset-card";
import { useStudioTools } from "@/components/chroma/webmcp";
import {
  initialDesign,
  presets,
  effects,
  isDesign,
  designCode,
  cssGradient,
  type Design,
} from "@/lib/chroma/design";
import { exportImage } from "@/lib/chroma/renderer";
import { historyReducer } from "@/lib/chroma/history";
import {
  DRAFT_KEY,
  readDraft,
  readCollection,
  persistCollection,
  downloadBlob,
  filename,
  type SavedDesign,
} from "@/lib/chroma/storage";

type Modal = "save" | "export" | "help" | "commands" | null;
export default function Studio() {
  const [history, dispatch] = useReducer(historyReducer, {
    past: [],
    present: initialDesign,
    future: [],
    origin: null,
  });
  const design = history.present;
  const [playing, setPlaying] = useState(false);
  const [view, setView] = useState<"playground" | "collection">("playground");
  const [collection, setCollection] = useState<SavedDesign[]>([]);
  const [ready, setReady] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [name, setName] = useState("");
  const [showType, setShowType] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [exportSize, setExportSize] = useState("1920");
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState<{
    url: string;
    name: string;
    width: number;
    height: number;
  } | null>(null);
  useEffect(
    () => () => {
      if (exported) URL.revokeObjectURL(exported.url);
    },
    [exported],
  );
  const [inspector, setInspector] = useState("design");
  const [codeTab, setCodeTab] = useState("json");
  const shader = useRef<ShaderHandle>(null),
    fileInput = useRef<HTMLInputElement>(null);
  const update = useCallback(
    (next: Design) => dispatch({ type: "update", design: next }),
    [],
  );
  const apply = useCallback((next: Design) => {
    dispatch({ type: "update", design: next });
    setView("playground");
  }, []);
  useStudioTools(design, apply);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const initialize = requestAnimationFrame(() => {
      const draft = readDraft();
      if (draft) dispatch({ type: "restore", design: draft });
      setCollection(readCollection());
      setPlaying(!media.matches);
      setReady(true);
    });
    const onChange = () => setPlaying(!media.matches);
    media.addEventListener("change", onChange);
    const sync = (e: StorageEvent) => {
      if (e.key === "chroma:collection:v1") setCollection(readCollection());
    };
    window.addEventListener("storage", sync);
    return () => {
      cancelAnimationFrame(initialize);
      media.removeEventListener("change", onChange);
      window.removeEventListener("storage", sync);
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    const id = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(design));
      } catch {
        /* Collection save reports storage failure explicitly. */
      }
    }, 350);
    return () => clearTimeout(id);
  }, [design, ready]);
  const startSave = useCallback(() => {
    setName(design.name);
    setModal("save");
  }, [design.name]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      const el = event.target as HTMLElement;
      const editing = el.matches(
        "input,textarea,select,[contenteditable=true]",
      );
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setModal((m) => (m === "commands" ? null : "commands"));
        return;
      }
      if (editing || modal) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        startSave();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        dispatch({ type: event.shiftKey ? "redo" : "undo" });
      }
      if (
        event.code === "Space" &&
        (el === document.body || el === document.documentElement)
      ) {
        event.preventDefault();
        setPlaying((p) => !p);
      }
      if (event.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [modal, startSave]);
  function shufflePalette() {
    const alternatives = presets.filter(
      (p) => p.colors.join() !== design.colors.join(),
    );
    const pick = alternatives[Math.floor(Math.random() * alternatives.length)];
    update({ ...design, colors: [...pick.colors] });
  }
  function surprise() {
    const p = presets[Math.floor(Math.random() * presets.length)];
    update({
      ...p,
      name: "Happy accident",
      seed: Math.floor(Math.random() * 100),
      distortion: 25 + Math.floor(Math.random() * 75),
    });
    toast("A happy accident. Keep exploring.");
  }
  function save() {
    if (!name.trim()) return;
    if (collection.length >= 60) {
      toast.error("Your collection is full. Remove a preset to save another.");
      return;
    }
    const item: SavedDesign = {
      id: crypto.randomUUID(),
      design: { ...design, name: name.trim() },
      createdAt: new Date().toISOString(),
    };
    const next = [item, ...collection];
    try {
      persistCollection(next);
      setCollection(next);
      update(item.design);
      setModal(null);
      toast.success("Saved to your collection", {
        description:
          "Stored in this browser. Export JSON to keep a portable copy.",
      });
    } catch {
      toast.error(
        "Browser storage is full or unavailable. Export your design as JSON to keep it.",
      );
    }
  }
  function remove(item: SavedDesign) {
    const next = collection.filter((p) => p.id !== item.id);
    try {
      persistCollection(next);
      setCollection(next);
      toast("Preset removed", {
        action: {
          label: "Undo",
          onClick: () => {
            try {
              const restored = [
                item,
                ...readCollection().filter((p) => p.id !== item.id),
              ].slice(0, 60);
              persistCollection(restored);
              setCollection(restored);
            } catch {
              toast.error("Unable to restore. Browser storage is unavailable.");
            }
          },
        },
      });
    } catch {
      toast.error("Could not update your collection.");
    }
  }
  async function exportPng() {
    setExporting(true);
    try {
      const width = Number(exportSize),
        height = Math.round(width / 1.6),
        time = shader.current?.getTime() ?? 0;
      const blob = await exportImage(design, time, width, height);
      setExported({
        url: URL.createObjectURL(blob),
        name: `${filename(design.name)}-${width}.png`,
        width,
        height,
      });
      toast.success("Your artwork is ready", {
        description: `${width} × ${height} PNG is ready to save.`,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Export failed. Try again.",
      );
    } finally {
      setExporting(false);
    }
  }
  function exportJson() {
    downloadBlob(
      new Blob([designCode(design)], { type: "application/json" }),
      `${filename(design.name)}.chroma.json`,
    );
    toast.success("Design settings downloaded");
  }
  async function importDesign(file?: File) {
    if (!file) return;
    try {
      if (file.size > 20000)
        throw new Error("Choose a CHROMA JSON file smaller than 20 KB.");
      const data = JSON.parse(await file.text());
      if (data.version !== 1 || !isDesign(data.design))
        throw new Error("That file is not a valid CHROMA design.");
      apply(data.design);
      toast.success(`Imported ${data.design.name}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not import this file.",
      );
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error(
        "Clipboard access is unavailable. Select and copy the code below.",
      );
    }
  }
  const code = codeTab === "json" ? designCode(design) : cssGradient(design);
  const run = (action: () => void) => {
    setModal(null);
    action();
  };
  return (
    <div className={"app-shell " + (expanded ? "is-expanded" : "")}>
      <Toaster theme="dark" position="bottom-center" richColors />
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        aria-label="Import CHROMA design"
        tabIndex={-1}
        onChange={(event) => void importDesign(event.target.files?.[0])}
      />
      <header className="site-header">
        <a
          href="#main"
          onClick={() => setView("playground")}
          className="brand"
          aria-label="Chroma home"
        >
          <Aperture />
          <span>
            chroma<span className="brand-period">.</span>
          </span>
        </a>
        <nav className="top-nav" aria-label="Main navigation">
          <button
            className={view === "playground" ? "active" : ""}
            aria-current={view === "playground" ? "page" : undefined}
            onClick={() => setView("playground")}
          >
            Playground
          </button>
          <button
            className={view === "collection" ? "active" : ""}
            aria-current={view === "collection" ? "page" : undefined}
            onClick={() => setView("collection")}
          >
            My collection <span className="count">{collection.length}</span>
          </button>
        </nav>
        <div className="header-actions">
          <span className="edition">A SPACE TO EXPERIMENT</span>
          <button
            className="icon-button"
            aria-label="Help and shortcuts"
            title="Help and shortcuts"
            onClick={() => setModal("help")}
          >
            <CircleHelp size={19} />
          </button>
          <span className="avatar" aria-label="Chroma studio">
            C
          </span>
        </div>
      </header>
      <main id="main">
        <section className="intro">
          <div>
            <p className="eyebrow">
              <span /> A LITTLE CURIOSITY. INFINITE POSSIBILITIES.
            </p>
            <h1>
              {view === "playground" ? (
                <>
                  Good things happen <span>when you play.</span>
                </>
              ) : (
                <>
                  Your ideas. <span>All in one place.</span>
                </>
              )}
            </h1>
            <p className="intro-copy">
              {view === "playground"
                ? "Shape color. Find your flow. Make something entirely yours."
                : "A collection of happy accidents, unexpected colors, and things worth keeping."}
            </p>
          </div>
          <button
            className="button secondary"
            onClick={() => setModal("commands")}
          >
            <CommandIcon size={15} />
            <span>Quick actions</span>
            <kbd>⌘ K</kbd>
          </button>
        </section>
        <div hidden={view !== "playground"}>
          <section className="studio" aria-label="Design studio">
            <div className="canvas-column">
              <div className="canvas-toolbar">
                <div className="composition-name">
                  <span className="tiny-mark" />
                  <span>{design.name}</span>
                  <span className="subtle-tag">Your exploration</span>
                </div>
                <div className="toolbar-actions">
                  <button
                    className="icon-button"
                    aria-label="Undo"
                    title="Undo (⌘ Z)"
                    disabled={!history.past.length && !history.origin}
                    onClick={() => dispatch({ type: "undo" })}
                  >
                    <Undo2 size={17} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Redo"
                    title="Redo (⌘ ⇧ Z)"
                    disabled={!history.future.length}
                    onClick={() => dispatch({ type: "redo" })}
                  >
                    <Redo2 size={17} />
                  </button>
                  <span className="toolbar-divider" />
                  <button
                    className={"icon-button " + (showType ? "is-on" : "")}
                    aria-label="Toggle typography preview"
                    aria-pressed={showType}
                    title="Toggle typography preview"
                    onClick={() => setShowType(!showType)}
                  >
                    <Type size={17} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={expanded ? "Collapse canvas" : "Expand canvas"}
                    title={expanded ? "Collapse canvas" : "Expand canvas"}
                    onClick={() => setExpanded(!expanded)}
                  >
                    {expanded ? (
                      <Minimize2 size={17} />
                    ) : (
                      <Maximize2 size={17} />
                    )}
                  </button>
                </div>
              </div>
              <div className="canvas-stage">
                <ShaderCanvas
                  ref={shader}
                  design={design}
                  playing={playing && view === "playground"}
                />
                <div className="canvas-top-label">
                  <span className={playing ? "live-dot" : "paused-dot"} />
                  {playing ? "LIVE CANVAS" : "STILL FRAME"}
                </div>
                <span className="canvas-index">
                  EXPERIMENT / {String(design.seed).padStart(3, "0")}
                </span>
                {showType && (
                  <div className="artwork-wordmark" aria-hidden="true">
                    Less thinking.
                    <br />
                    <em>More feeling.</em>
                  </div>
                )}
                <div className="canvas-bottom-label">
                  <span>COLOR IN MOTION</span>
                  <Aperture size={25} />
                  <span>MADE WITH CHROMA</span>
                </div>
              </div>
              <div className="playback-bar">
                <div className="playback">
                  <button
                    className="play-button"
                    onClick={() => setPlaying(!playing)}
                    aria-label={playing ? "Pause animation" : "Play animation"}
                  >
                    {playing ? (
                      <Pause size={14} fill="currentColor" />
                    ) : (
                      <Play size={14} fill="currentColor" />
                    )}
                  </button>
                  <span>{playing ? "In motion" : "Paused"}</span>
                  <div
                    className={"waveform " + (!playing ? "paused" : "")}
                    aria-hidden="true"
                  >
                    {Array.from({ length: 19 }, (_, i) => (
                      <i
                        key={i}
                        style={{
                          animationDelay: `${i * 0.08}s`,
                          height: `${5 + ((i * 7) % 14)}px`,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="canvas-spec">
                  <button
                    className="text-button surprise-button"
                    onClick={surprise}
                    title="Generate a new variation"
                  >
                    <Shuffle size={13} />
                    <span>Surprise me</span>
                  </button>
                  <span className="dot-separator">·</span>
                  <span>WebGL</span>
                </div>
              </div>
            </div>
            <aside className="controls" aria-label="Design controls">
              <Tabs value={inspector} onValueChange={setInspector}>
                <TabsList className="inspector-tabs">
                  <TabsTrigger value="design">
                    <SlidersHorizontal size={15} />
                    Design
                  </TabsTrigger>
                  <TabsTrigger value="code">
                    <Code2 size={15} />
                    Code
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="design">
                  <div className="control-section">
                    <div className="section-label">
                      <span>Effect</span>
                      <span className="micro">01</span>
                    </div>
                    <div className="effect-grid">
                      {effects.map((e) => (
                        <button
                          key={e.id}
                          className={
                            "effect-button " +
                            (design.effect === e.id ? "selected" : "")
                          }
                          aria-pressed={design.effect === e.id}
                          title={e.description}
                          onClick={() => update({ ...design, effect: e.id })}
                        >
                          <span className={"effect-symbol " + e.id} />
                          {e.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="control-section">
                    <div className="section-label">
                      <span>Color palette</span>
                      <button
                        className="text-button"
                        onClick={shufflePalette}
                        aria-label="Shuffle palette"
                        title="Shuffle palette"
                      >
                        <Shuffle size={14} />
                      </button>
                    </div>
                    <div className="palette">
                      {design.colors.map((c, i) => (
                        <label
                          key={i}
                          className="color-control"
                          style={{ background: c }}
                        >
                          <input
                            type="color"
                            value={c}
                            aria-label={`Color ${i + 1}`}
                            onChange={(e) => {
                              const colors = [
                                ...design.colors,
                              ] as Design["colors"];
                              colors[i] = e.target.value;
                              dispatch({
                                type: "preview",
                                design: { ...design, colors },
                              });
                            }}
                            onBlur={() => dispatch({ type: "commit" })}
                          />
                          <span>{String(i + 1).padStart(2, "0")}</span>
                        </label>
                      ))}
                    </div>
                    <div className="palette-codes">
                      {design.colors.map((c, i) => (
                        <span key={i}>{c.slice(1).toUpperCase()}</span>
                      ))}
                    </div>
                  </div>
                  <div className="control-section parameters">
                    <div className="section-label">
                      <span>Fine tune</span>
                      <SlidersHorizontal size={14} />
                    </div>
                    {(["speed", "scale", "distortion", "grain"] as const).map(
                      (key) => (
                        <div className="parameter" key={key}>
                          <div>
                            <label id={`${key}-label`}>
                              {key === "speed"
                                ? "Motion speed"
                                : key === "grain"
                                  ? "Grain texture"
                                  : key[0].toUpperCase() + key.slice(1)}
                            </label>
                            <span>
                              {design[key]}
                              <small>%</small>
                            </span>
                          </div>
                          <LabeledSlider
                            labelId={`${key}-label`}
                            value={[design[key]]}
                            max={100}
                            step={1}
                            onValueChange={(v) =>
                              dispatch({
                                type: "preview",
                                design: { ...design, [key]: v[0] },
                              })
                            }
                            onValueCommit={() => dispatch({ type: "commit" })}
                            onGestureEnd={() => dispatch({ type: "commit" })}
                          />
                        </div>
                      ),
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="code">
                  <div className="code-panel">
                    <div className="section-label">
                      <span>Take it with you</span>
                      <Code2 size={15} />
                    </div>
                    <Tabs value={codeTab} onValueChange={setCodeTab}>
                      <TabsList className="code-tabs">
                        <TabsTrigger value="json">Design JSON</TabsTrigger>
                        <TabsTrigger value="css">CSS palette</TabsTrigger>
                      </TabsList>
                      <TabsContent value="json">
                        <p>
                          Portable settings for this shader. Import them into
                          CHROMA to keep creating.
                        </p>
                      </TabsContent>
                      <TabsContent value="css">
                        <p>
                          A static CSS interpretation of your palette. For the
                          exact shader, export a PNG.
                        </p>
                      </TabsContent>
                    </Tabs>
                    <pre
                      className="code-block"
                      tabIndex={0}
                      aria-label={
                        codeTab === "json"
                          ? "Design JSON code"
                          : "CSS gradient code"
                      }
                    >
                      <code>{code}</code>
                    </pre>
                    <button
                      className="button secondary copy-button"
                      onClick={() => void copy(code)}
                    >
                      <Copy size={14} />
                      Copy {codeTab === "json" ? "JSON" : "CSS"}
                    </button>
                    <button
                      className="text-button import-code"
                      onClick={() => fileInput.current?.click()}
                    >
                      <Upload size={14} />
                      Import a design
                    </button>
                  </div>
                </TabsContent>
              </Tabs>
              <div className="inspector-footer">
                <button className="button secondary" onClick={startSave}>
                  <Bookmark size={16} />
                  Save preset
                </button>
                <button
                  className="button primary"
                  onClick={() => setModal("export")}
                >
                  <Download size={16} />
                  Export
                </button>
              </div>
            </aside>
          </section>
          <section className="preset-section">
            <div className="preset-heading">
              <div>
                <h2>
                  A starting point for your next idea<span>.</span>
                </h2>
                <p>Curated experiments. Yours to make a little different.</p>
              </div>
              <span className="library-label">
                <Layers size={15} /> THE STARTER COLLECTION <span>06</span>
              </span>
            </div>
            <div className="preset-grid">
              {presets.map((p, i) => (
                <PresetCard
                  key={p.id}
                  design={p}
                  index={i}
                  category={p.category}
                  selected={JSON.stringify(p) === JSON.stringify(design)}
                  onSelect={() => apply({ ...p })}
                />
              ))}
            </div>
          </section>
        </div>
        {view === "collection" && (
          <section className="collection-section" aria-label="Saved collection">
            <div className="collection-toolbar">
              <span>
                {collection.length} saved{" "}
                {collection.length === 1 ? "exploration" : "explorations"}{" "}
                <span className="muted">· Stored in this browser</span>
              </span>
              <button
                className="button secondary"
                onClick={() => fileInput.current?.click()}
              >
                <Upload size={15} />
                Import design
              </button>
            </div>
            {collection.length ? (
              <div className="collection-grid">
                {collection.map((item, i) => (
                  <div className="saved-card" key={item.id}>
                    <PresetCard
                      design={item.design}
                      index={i}
                      category={
                        effects.find((e) => e.id === item.design.effect)
                          ?.name || "Custom"
                      }
                      onSelect={() => apply(item.design)}
                    />
                    <button
                      className="icon-button delete-preset"
                      aria-label={`Remove ${item.design.name}`}
                      onClick={() => remove(item)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="collection-empty">
                <div className="empty-icon">
                  <Bookmark size={28} />
                </div>
                <h2>Something worth keeping starts here.</h2>
                <p>
                  Explore a preset, find your colors, and save your favorite
                  version. Your collection is waiting.
                </p>
                <button
                  className="button primary"
                  onClick={() => setView("playground")}
                >
                  Back to the playground
                </button>
              </div>
            )}
          </section>
        )}
        <footer className="site-footer">
          <span>
            <Aperture size={15} /> Built for the joy of making.
          </span>
          <button className="text-button" onClick={() => setModal("help")}>
            A FEW HELPFUL SHORTCUTS <CommandIcon size={11} />
          </button>
          <span>CHROMA STUDIO © 2026</span>
        </footer>
      </main>
      <Dialog
        open={modal === "save"}
        onOpenChange={(open) => !open && setModal(null)}
      >
        <DialogContent className="studio-dialog">
          <DialogHeader>
            <div className="dialog-symbol">
              <Bookmark size={22} />
            </div>
            <DialogTitle>Keep this happy accident.</DialogTitle>
            <DialogDescription>
              Save your colors and settings to your personal collection in this
              browser.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <label className="field-label" htmlFor="preset-name">
              Give it a name
            </label>
            <input
              id="preset-name"
              className="text-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="Something beautiful"
              autoComplete="off"
              required
            />
            <div className="save-palette">
              {design.colors.map((c, i) => (
                <span key={i} style={{ background: c }} />
              ))}
            </div>
            <button
              className="button primary dialog-submit"
              type="submit"
              disabled={!name.trim()}
            >
              <Bookmark size={16} />
              Save to collection
            </button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={modal === "export"}
        onOpenChange={(open) => {
          if (!exporting && !open) {
            setModal(null);
            setExported(null);
          }
        }}
      >
        <DialogContent className="studio-dialog">
          <DialogHeader>
            <div className="dialog-symbol">
              <Download size={22} />
            </div>
            <DialogTitle>Made by you. Ready for anything.</DialogTitle>
            <DialogDescription>
              Export a clean frame of your artwork, without the preview
              typography or interface.
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="png">
            <TabsList className="export-tabs">
              <TabsTrigger value="png">Image · PNG</TabsTrigger>
              <TabsTrigger value="json">Design · JSON</TabsTrigger>
            </TabsList>
            <TabsContent value="png">
              {exported ? (
                <div className="export-result">
                  <picture>
                    <img
                      src={exported.url}
                      alt="Your rendered CHROMA artwork"
                      width={exported.width}
                      height={exported.height}
                    />
                  </picture>
                  <p className="export-note">
                    {exported.width} × {exported.height} · PNG · Ready to save
                  </p>
                  <a
                    className="button primary dialog-submit"
                    href={exported.url}
                    download={exported.name}
                  >
                    <Download size={16} />
                    Save PNG
                  </a>
                  <button
                    className="button secondary dialog-submit"
                    onClick={() => setExported(null)}
                  >
                    Render another frame
                  </button>
                </div>
              ) : (
                <>
                  <span className="field-label">Resolution · 16:10</span>
                  <div className="size-options">
                    {["1920", "2560", "3840"].map((size) => (
                      <button
                        key={size}
                        className={exportSize === size ? "selected" : ""}
                        onClick={() => setExportSize(size)}
                        aria-pressed={exportSize === size}
                      >
                        <span>
                          {size === "1920"
                            ? "Full HD"
                            : size === "2560"
                              ? "2K"
                              : "4K"}
                        </span>
                        <small>
                          {size} × {Math.round(Number(size) / 1.6)}
                        </small>
                        {exportSize === size && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                  <p className="export-note">
                    PNG captures the current animation frame. All rendering
                    happens on your device.
                  </p>
                  <button
                    className="button primary dialog-submit"
                    disabled={exporting}
                    onClick={() => void exportPng()}
                  >
                    {exporting ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <Download size={16} />
                    )}{" "}
                    {exporting ? "Rendering your artwork…" : "Render PNG"}
                  </button>
                </>
              )}
            </TabsContent>
            <TabsContent value="json">
              <p className="export-note">
                A small, editable file containing your effect, palette, and
                fine-tuning settings. Import it into CHROMA on any device.
              </p>
              <button
                className="button primary dialog-submit"
                onClick={exportJson}
              >
                <Download size={16} />
                Download design JSON
              </button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      <Dialog
        open={modal === "help"}
        onOpenChange={(open) => !open && setModal(null)}
      >
        <DialogContent className="studio-dialog">
          <DialogHeader>
            <div className="dialog-symbol">
              <Aperture size={24} />
            </div>
            <DialogTitle>A little room to experiment.</DialogTitle>
            <DialogDescription>
              Start with a preset. Make it your own. There is no wrong way to
              play.
            </DialogDescription>
          </DialogHeader>
          <div className="help-steps">
            <p>
              <strong>01 / Shape it</strong> Choose an effect, edit the four
              colors, and adjust the sliders.
            </p>
            <p>
              <strong>02 / Keep it</strong> Save a preset to this browser, or
              export JSON to carry it with you.
            </p>
            <p>
              <strong>03 / Share it</strong> Export up to 4K PNG. The typography
              is a preview layer and stays out of your artwork.
            </p>
          </div>
          <div className="keyboard-list">
            <span>
              Quick actions<kbd>⌘ / Ctrl K</kbd>
            </span>
            <span>
              Save preset<kbd>⌘ / Ctrl S</kbd>
            </span>
            <span>
              Undo / redo<kbd>⌘ Z / ⌘ ⇧ Z</kbd>
            </span>
            <span>
              Play / pause<kbd>Space</kbd>
            </span>
          </div>
          <div className="motion-setting">
            <label htmlFor="motion-toggle">Animate the canvas</label>
            <Switch
              id="motion-toggle"
              checked={playing}
              onCheckedChange={setPlaying}
            />
          </div>
          <p className="help-footnote">
            CHROMA respects your device’s reduced-motion preference. Built with
            React, TypeScript, and an original WebGL renderer.
          </p>
        </DialogContent>
      </Dialog>
      <Dialog
        open={modal === "commands"}
        onOpenChange={(open) => !open && setModal(null)}
      >
        <DialogContent className="command-dialog" showCloseButton={false}>
          <DialogHeader className="sr-only">
            <DialogTitle>Quick actions</DialogTitle>
            <DialogDescription>
              Search for presets and studio actions.
            </DialogDescription>
          </DialogHeader>
          <Command>
            <CommandInput placeholder="What would you like to create?" />
            <CommandList>
              <CommandEmpty>
                No matching actions. Try a preset name.
              </CommandEmpty>
              <CommandGroup heading="Studio">
                <CommandItem onSelect={() => run(() => setPlaying(!playing))}>
                  {playing ? <Pause /> : <Play />}
                  {playing ? "Pause animation" : "Play animation"}
                  <CommandShortcut>Space</CommandShortcut>
                </CommandItem>
                <CommandItem onSelect={startSave}>
                  <Bookmark />
                  Save preset<CommandShortcut>⌘ S</CommandShortcut>
                </CommandItem>
                <CommandItem onSelect={() => setModal("export")}>
                  <Download />
                  Export artwork
                </CommandItem>
                <CommandItem onSelect={() => run(surprise)}>
                  <Shuffle />
                  Surprise me
                </CommandItem>
                <CommandItem
                  onSelect={() => run(() => fileInput.current?.click())}
                >
                  <Upload />
                  Import design JSON
                </CommandItem>
                <CommandItem
                  onSelect={() =>
                    run(() =>
                      setView(
                        view === "collection" ? "playground" : "collection",
                      ),
                    )
                  }
                >
                  <Layers />
                  {view === "collection"
                    ? "Open playground"
                    : "Open my collection"}
                </CommandItem>
                <CommandItem
                  onSelect={() =>
                    run(() => {
                      apply({ ...initialDesign });
                      toast("Reset to Afterglow. You can undo this.");
                    })
                  }
                >
                  <RotateCcw />
                  Reset canvas
                </CommandItem>
              </CommandGroup>
              <CommandGroup heading="Explore a preset">
                {presets.map((p) => (
                  <CommandItem
                    key={p.id}
                    onSelect={() => run(() => apply({ ...p }))}
                  >
                    <span
                      className="command-swatch"
                      style={{ background: p.colors[2] }}
                    />
                    {p.name}
                    <CommandShortcut>{p.category}</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </div>
  );
}
