import { isDesign, type Design } from "./design";
export type SavedDesign = { id: string; design: Design; createdAt: string };
export const DRAFT_KEY = "chroma:draft:v1";
export const COLLECTION_KEY = "chroma:collection:v1";
export function readDraft(): Design | null {
  try {
    const value = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
    return isDesign(value) ? value : null;
  } catch {
    return null;
  }
}
export function readCollection(): SavedDesign[] {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(COLLECTION_KEY) || "[]",
    );
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (x): x is SavedDesign =>
          !!x &&
          typeof x.id === "string" &&
          typeof x.createdAt === "string" &&
          isDesign(x.design),
      )
      .slice(0, 60);
  } catch {
    return [];
  }
}
export function persistCollection(collection: SavedDesign[]) {
  localStorage.setItem(COLLECTION_KEY, JSON.stringify(collection));
}
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export const filename = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "chroma-design";
