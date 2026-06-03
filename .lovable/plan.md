# CubeX-style Rebuild Plan

Reshape the app so it looks and behaves like the reference screenshots: a clean 2-column home grid, a bold rotatable Virtual Cube, a real-time camera scanner with tips, an Advanced Solver results modal, a two-pad WCA timer, and a focused Settings page.

## 1. Home — 2x2 grid like CubeX

Rewrite `/home` to match the reference:

- Big bold "CubeX" (or current brand) wordmark at top.
- Section label "Solve" with a small cube icon.
- 6 tiles in a 2-column grid, each a large dark card with white icon + label:
  1. **Manual Input** → `/manual-input`
  2. **Camera Input** → `/camera`
  3. **Pattern Solver** → `/solver` (advanced solver UI)
  4. **Virtual Cube** → `/virtual-cube` (new route, hand-rotatable)
  5. **Cube Timer** → `/timer`
  6. **Settings** → `/settings`
- Remove gamification cards/banners. Hide bottom nav on Home (tiles replace it) or keep a minimal Home/Back bar.

## 2. Virtual Cube — bold, hand-rotatable

New route `/virtual-cube` (or replace `/solver` body) matching screenshot 2:

- Header: back chevron · centered "Virtual Cube" · 3-dot menu.
- Large black canvas takes ~70% of screen, cube centered with subtle radial vignette.
- **Hand/touch rotation**: drag anywhere on the canvas to orbit the whole cube (OrbitControls, damped). Two-finger pinch zooms. No face turns from drag — that stays on the control pad / keyboard.
- Below canvas: a faint Play ▶ icon, big 00 : 00 : 00 display, and a square Stop icon (mini timer strip).
- Bottom row of 3 outlined buttons: **Scramble · Solve · Reset**.
  - Scramble: 20–25 random legal moves animated through the queue.
  - Solve: opens the Advanced Solver modal (section 4).
  - Reset: snaps cube back to solved.

## 3. Camera Input — real-time scan with Tips overlay

Rewrite `/camera` to match screenshot 1:

- Back chevron · 3-dot menu, transparent over the live video.
- Full-screen `<video>` (auto-plays after the user taps Enable Camera once) with a centered white 3x3 grid overlay sized to a square in the upper half.
- Bottom strip: row of 3 (or 6) color swatches showing the colors currently detected at the 9 sticker centers, updated ~5×/sec from `classifyFace`.
- Bottom: a big **SCAN** button. Tap captures current 9 colors into the active face, advances to the next face, and shows a small "U/R/F/D/L/B" pill.
- First open shows a **Tips 1/3** bottom-sheet card with the reference photo and "Focus your cube inside the grid and press Scan" — Next cycles through 3 tips, last tip's button says "Got it" and dismisses. Persist dismissal in localStorage.
- After all 6 faces captured: stop tracks, navigate to `/solution` (or open Advanced Solver modal on the Virtual Cube screen) with the assembled state.
- Permission flow stays gesture-gated (already fixed): show "Enable Camera" if `status==='idle'`, "Retry" if denied, and a fallback link to Manual Input.

## 4. Advanced Solver modal

When the user taps **Solve** on the Virtual Cube (or finishes Camera/Manual), open a centered modal matching screenshot 3:

- Title row: small cube icon + "Advanced Solver" + close ✕.
- Status row: spinner + "Solver Running.." while Kociemba runs (also shown briefly when results stream in).
- List of solution options, each a row: **"N Moves"** on the left, eye 👁 icon on the right.
  - Run Kociemba twice (e.g. depth limits 20, 22, 24) or take the best solution and also show its length minus 1/2 by running additional passes; show up to 3 results. If only one is returned, only show that row.
  - Tapping a row (or its eye) closes the modal and seeds the Virtual Cube's move queue with that sequence, then auto-plays through the existing SolveAnimationControls.
- On invalid scan: replace list with an "Edit colors" CTA that opens `/manual-input` prefilled with the scanned state.

## 5. Cube Timer — two-pad WCA timer

Rewrite `/timer` to match screenshot 4 (mobile layout, stacked instead of side-by-side):

- Two large round pads (left and right) the user must hold simultaneously.
  - On mobile: stack pads top/bottom or place left/right within a single row that fits 360px (smaller circles).
- "Place hands on pads" label above the time display.
- 7-segment style **00 : 00 : 00** in the middle.
- Below: three small stat cells **Ao5 · Avg · Ao12** with the current values (— when empty), stored in localStorage.
- Bottom dark bar with 4 actions: ◀ **Back** · 📦 **Generate Scramble** · ⏱ **Records** · ❓ **Help**.
  - Generate Scramble pushes a scramble string into a small card above the timer.
  - Records opens a bottom-sheet list of past solves (localStorage).
  - Help opens a short rules sheet (15s inspection, hold both pads to start).
- Logic: both pads pressed for 0.5s → green ready → release both → timer starts; any tap → timer stops; +2/DNF buttons appear in the result card. Reuse `useWCATimer`.

## 6. Settings — focused list

Rewrite `/settings`:

- Header "Settings".
- Grouped list:
  - **Animation speed** — segmented control Slow · Normal · Fast (writes `CubeSettings.animationSpeed`).
  - **Idle auto-rotate** — toggle (writes `CubeSettings.idleAutoRotate`).
  - **Theme** — Dark / System (already exists if any; otherwise just Dark).
  - **Reset records** — clears timer history.
  - **About** — version, GitHub link.
- All values persist via existing `CubeSettingsProvider` (localStorage `jsn_cube_settings`).

## 7. Cube engine guarantees (already in place — verify)

- All face turns go through `executeMove`/move queue → no color mixing.
- Drag on Virtual Cube only orbits the camera, never triggers a face turn.
- Speed presets read from `useCubeSettings()` in Virtual Cube, Solution playback, and Solver.

## Technical notes

- **Files rewritten**: `src/pages/Home.tsx`, `src/pages/CameraInput.tsx`, `src/pages/Solver.tsx` (or new `src/pages/VirtualCube.tsx` + route), `src/pages/Timer.tsx`, `src/pages/Settings.tsx`, `src/components/CubeRenderer3D.tsx` (ensure OrbitControls enabled, pad-only face turns).
- **Files added**: `src/components/AdvancedSolverModal.tsx`, `src/components/CameraTipsSheet.tsx`, `src/components/LiveSwatchStrip.tsx`, `src/components/TimerPads.tsx`, `src/pages/VirtualCube.tsx`.
- **Routes**: add `/virtual-cube` in `src/App.tsx`; keep `/solver`, `/solution`, `/manual-input`, `/camera`, `/timer`, `/settings`.
- **Solver**: reuse `kociembaSolver`; wrap in a helper that returns up to 3 solutions (different max-depth params) for the Advanced Solver modal.
- **Color readout**: throttle `classifyFace` to 200ms in `CameraInput` and pass results to `LiveSwatchStrip`.
- **Bottom nav**: hide on Home, Camera, Virtual Cube (full-screen feel); keep on Timer/Settings if useful, otherwise remove entirely since Home is the hub.

## Out of scope

- Auth, payments, gamification (Collection, Premium, Levels, PlayCube) — left as dormant files.
- 4x4+ puzzles.
- Real ad slot — the reference's ad banners are not reproduced.

## ASCII home layout

```text
+-------------------------+
|        CubeX            |
|                         |
|  [#] Solve              |
|  +---------+---------+  |
|  | Manual  | Camera  |  |
|  | Input   | Input   |  |
|  +---------+---------+  |
|  | Pattern | Virtual |  |
|  | Solver  | Cube    |  |
|  +---------+---------+  |
|  | Cube    | Settings|  |
|  | Timer   |         |  |
|  +---------+---------+  |
+-------------------------+
```
