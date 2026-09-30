"use client";
import { useEffect, useState } from "react";
import { Check, Plus } from "lucide-react";
import type { Design } from "@/lib/chroma/design";
import { thumbnail } from "@/lib/chroma/renderer";
export function PresetCard({
  design,
  index,
  category,
  selected,
  onSelect,
}: {
  design: Design;
  index: number;
  category: string;
  selected?: boolean;
  onSelect: () => void;
}) {
  const [image, setImage] = useState("");
  useEffect(() => {
    let active = true;
    const id = requestAnimationFrame(() => {
      try {
        const src = thumbnail(design);
        if (active) setImage(src);
      } catch {
        /* Accessible gradient fallback when WebGL is unavailable. */
      }
    });
    return () => {
      active = false;
      cancelAnimationFrame(id);
    };
  }, [design]);
  return (
    <button
      className={"preset-card " + (selected ? "is-selected" : "")}
      onClick={onSelect}
      aria-label={`Apply ${design.name}`}
      aria-pressed={!!selected}
    >
      <div
        className="preset-art"
        style={{
          backgroundImage: image
            ? `url(${image})`
            : `linear-gradient(135deg,${design.colors.join(",")})`,
        }}
      >
        <span className="preset-number">
          {String(index + 1).padStart(2, "0")}
        </span>
        {selected ? (
          <span className="preset-selected">
            <Check size={13} />
          </span>
        ) : (
          <span className="preset-use">
            <Plus size={17} />
          </span>
        )}
      </div>
      <div className="preset-caption">
        <strong>{design.name}</strong>
        <span>{category}</span>
      </div>
    </button>
  );
}
