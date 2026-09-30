export type Effect = "flow" | "mesh" | "halo" | "ribbons";
export type Design = {
  name: string;
  effect: Effect;
  colors: [string, string, string, string];
  speed: number;
  scale: number;
  distortion: number;
  grain: number;
  seed: number;
};
export type Preset = Design & {
  id: string;
  category: "Fluid" | "Atmospheric" | "Geometric";
};
export const effects: { id: Effect; name: string; description: string }[] = [
  {
    id: "flow",
    name: "Liquid flow",
    description: "Soft folds of light and color",
  },
  {
    id: "mesh",
    name: "Mesh gradient",
    description: "A soft, evolving color field",
  },
  {
    id: "halo",
    name: "Orbital glow",
    description: "Light with a gravitational pull",
  },
  {
    id: "ribbons",
    name: "Silk ribbons",
    description: "Sculptural waves in motion",
  },
];
export const presets: Preset[] = [
  {
    id: "afterglow",
    name: "Afterglow",
    category: "Fluid",
    effect: "flow",
    colors: ["#180A3D", "#6934D4", "#FF6535", "#FFCBA1"],
    speed: 35,
    scale: 45,
    distortion: 65,
    grain: 16,
    seed: 7,
  },
  {
    id: "acid-dream",
    name: "Acid dream",
    category: "Fluid",
    effect: "flow",
    colors: ["#142B25", "#547A34", "#D3F88B", "#F8FFE2"],
    speed: 25,
    scale: 30,
    distortion: 78,
    grain: 20,
    seed: 11,
  },
  {
    id: "blue-hour",
    name: "Blue hour",
    category: "Atmospheric",
    effect: "mesh",
    colors: ["#071D4C", "#244BDC", "#91CCFF", "#EBBFEF"],
    speed: 22,
    scale: 46,
    distortion: 55,
    grain: 12,
    seed: 3,
  },
  {
    id: "supernova",
    name: "Supernova",
    category: "Atmospheric",
    effect: "halo",
    colors: ["#100E26", "#D22A66", "#FC7849", "#FFD9BC"],
    speed: 18,
    scale: 56,
    distortion: 55,
    grain: 15,
    seed: 9,
  },
  {
    id: "ultraviolet",
    name: "Ultraviolet",
    category: "Geometric",
    effect: "ribbons",
    colors: ["#111026", "#5341AE", "#BEA5FF", "#E4DBFF"],
    speed: 28,
    scale: 44,
    distortion: 50,
    grain: 8,
    seed: 5,
  },
  {
    id: "tidal",
    name: "Tidal",
    category: "Fluid",
    effect: "flow",
    colors: ["#062E37", "#136C88", "#66CFC0", "#D5F5CF"],
    speed: 30,
    scale: 38,
    distortion: 72,
    grain: 18,
    seed: 17,
  },
];
export const initialDesign: Design = { ...presets[0] };
export const paletteSets: Design["colors"][] = presets.map((p) => [
  ...p.colors,
]);
export function isDesign(value: unknown): value is Design {
  if (!value || typeof value !== "object") return false;
  const d = value as Design;
  return (
    typeof d.name === "string" &&
    d.name.length <= 80 &&
    effects.some((e) => e.id === d.effect) &&
    Array.isArray(d.colors) &&
    d.colors.length === 4 &&
    d.colors.every((c) => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c)) &&
    ["speed", "scale", "distortion", "grain", "seed"].every(
      (k) =>
        typeof d[k as keyof Design] === "number" &&
        Number.isFinite(d[k as keyof Design]) &&
        Number(d[k as keyof Design]) >= 0 &&
        Number(d[k as keyof Design]) <= 100,
    )
  );
}
export function designCode(design: Design) {
  return JSON.stringify({ version: 1, design }, null, 2);
}
export function cssGradient(design: Design) {
  return `background: radial-gradient(ellipse at 75% 25%, ${design.colors[3]} 0%, transparent 45%),\n  radial-gradient(ellipse at 25% 70%, ${design.colors[2]} 0%, transparent 50%),\n  linear-gradient(135deg, ${design.colors[0]}, ${design.colors[1]});`;
}
