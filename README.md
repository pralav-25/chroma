# CHROMA

**A playground for color and motion.** A complete browser-based shader studio built with React, TypeScript, and an original WebGL renderer.

CHROMA is a portfolio project with a working creative workflow: choose a preset, edit it live, save a variation, and export the result. It runs without API keys or a graphics service.

[Source on GitHub](https://github.com/pralav-25/chroma) · Created by [Pralav](https://github.com/pralav-25)

The live Vercel demo is linked in the repository About section.

## Run locally

Node.js 22.13+ and npm are required.

```sh
npm ci
npm run dev
```

Open the local URL printed by the server (normally http://localhost:3000).

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

After building, `npm start` serves the static `out/` directory locally. The included GitHub Actions workflow runs type checking, lint, domain tests, and a build on pushes and pull requests.

## What works

- Four original shader modes: liquid flow, mesh gradient, orbital glow, and silk ribbons.
- Six curated presets with thumbnails rendered by the same shader engine.
- Four editable colors plus speed, scale, distortion, and grain controls.
- Undo/redo with one history entry per completed slider gesture and a bounded 50-step history.
- Play/pause, typography preview toggle, expanded canvas, and randomized variations.
- Browser-local draft recovery and a named collection with removable presets and undo removal.
- High-resolution PNG exports at 1920, 2560, or 3840 pixels wide, in a 16:10 aspect ratio.
- Validated JSON import/export and a clearly labeled static CSS palette approximation.
- Searchable command palette, keyboard shortcuts, accessible dialogs, named slider controls, and reduced-motion handling.
- Responsive layouts and optional WebMCP tools for discovering and applying presets.

PNG exports contain the artwork only. Preview text and studio controls are intentionally excluded. JSON saves design settings, not the exact animation timestamp. Collection data stays in the current browser; it does not sync across devices. Export JSON for a portable backup.

## Architecture

| Module | Responsibility |
| --- | --- |
| `app/page.tsx` | Editor composition and user workflows |
| `components/chroma/shader-canvas.tsx` | Canvas lifecycle, resize observer, animation timing, context recovery |
| `lib/chroma/renderer.ts` | Original GLSL, GPU resource management, image rendering |
| `lib/chroma/history.ts` | Pure undo/redo reducer with gesture transactions |
| `lib/chroma/design.ts` | Design types, presets, boundary validation, portable serialization |
| `lib/chroma/storage.ts` | Browser-local persistence and download helpers |
| `components/chroma/webmcp.tsx` | Optional, validated browser-agent actions |
| `components/ui/` | Existing shadcn/Radix primitives |
| `tests/core.test.mjs` | State transitions and malformed-import protection |
| `tests/renderer.test.mjs` | GPU export limits and renderer resource lifecycle |

React owns the interface and design state. The animation loop reads the latest settings without driving React renders on every frame. One fullscreen triangle is drawn per frame; colors and parameters are uniforms. Device pixel ratio is capped at 1.75 for interactive rendering, and hidden documents skip rendering. PNG export uses a separate canvas at the requested resolution.

The framework is Next.js with React 19 and a static export. `npm run build` produces the `out/` directory. CHROMA needs no backend, database, authentication, or API keys. Dependency versions are locked in `package-lock.json`.

## Deploy on Vercel

Import this GitHub repository into Vercel. The checked-in `vercel.json` selects the Other preset, runs the Next.js build with `npm run build`, and serves the static `out/` directory. Leave the Root Directory as the repository root. Future pushes to `main` publish production updates.

Vercel provides the production URL for canonical/social metadata. For another host, set `NEXT_PUBLIC_SITE_URL` before building.

## Research and design references

These were reviewed as primary sources, not copied as an application template:

- [Paper Shaders](https://github.com/paper-design/shaders): a useful example of lightweight, configurable shader primitives and visual editing. CHROMA uses its own shader implementation, not this package.
- [React Three Fiber](https://github.com/pmndrs/react-three-fiber): researched for declarative graphics and renderer integration. A small native WebGL renderer was selected because this project needs procedural 2D fields, not a 3D scene graph.
- [Motion accessibility](https://motion.dev/docs/react-accessibility): reduced-motion support as part of interaction design. CHROMA implements this with `matchMedia` and CSS.
- [MDN WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices): bounded render sizes, context lifecycle, explicit resource cleanup, and avoiding unnecessary rendering.

The UI, art direction, shader formulas, state logic, and product copy are original to this project. The icon set is Lucide. Existing shadcn components retain their upstream source and dependency licensing.

## Keyboard controls

| Action | Shortcut |
| --- | --- |
| Quick actions | Command / Control + K |
| Save preset | Command / Control + S |
| Undo | Command / Control + Z |
| Redo | Command / Control + Shift + Z |
| Play or pause when page background has focus | Space |
| Close dialog / leave expanded view | Escape |

## Practical limits

WebGL and hardware acceleration must be available. A graphics error state is shown when the context is unavailable; settings remain editable. An export that exceeds the device's GPU limit is rejected with a request to choose a lower resolution, rather than silently resizing the artwork. This is a frontend portfolio application: there is no cloud account system, collaboration, video export, or backend collection service.

The hosted studio is public. Drafts and collections stay in each visitor's own browser; they are not uploaded to the site. The source is available at [pralav-25/chroma](https://github.com/pralav-25/chroma).
