# End-to-End Rebuild Plan

Fix the whole journey so it behaves like a real Rubik's Cube app: **Sign in → Home (3 input choices) → Input → Solve → Solution dashboard with full step controls**. Camera, manual input, 3D rotation, and solution playback all get repaired in one pass.

## 1. Clean entry flow

Strip the messy routing so users land where they expect:

- **Splash → Sign in** (email + Google via Lovable Cloud, if not already wired we keep the existing local welcome).
- **/home** = the only main hub. Three big cards:
  1. **Manual input** → `/manual-input`
  2. **Camera scan** → `/camera`
  3. **Open solver / playground** → `/solver`
- Remove leftover gamification entry points (Collection, Premium, Levels, PlayCube) from the home and bottom nav. Keep their files so nothing breaks, just hide them.
- Bottom nav: Home · Scan · Solver · Timer · Settings.

## 2. Manual input rebuild (tabs per face)

Rewrite `/manual-input` with a simple, reliable flow:

- Tabs across the top: **U · R · F · D · L · B** (with center color shown so users know which face).
- Below tabs: a 3x3 grid for the active face. Tap a sticker → it cycles through the 6 colors (or pick from a color palette below the grid).
- Center sticker is locked to that face's color (prevents invalid states).
- Live mini "unfolded net" preview at the bottom showing all 6 faces so users see progress.
- **Solve** button is disabled until all 54 stickers are filled. On click → validate (each color exactly 9 times, centers unique) → navigate to `/solution` with the cube state.

## 3. Camera fix (live video + per-sticker color preview)

The camera popup currently shows but no video appears. Fixes:

- Call `getUserMedia` **directly inside the user's tap handler** (not inside an auto-start effect) — browsers block the stream when it's chained off mounting.
- Show an explicit **"Enable Camera"** button first; tap → request permission → attach stream to `<video>`.
- Once live, overlay the 3x3 grid and run the color classifier every ~400ms on just the 9 sticker centers, painting a small swatch row under the video so users see what colors will be captured **before** they hit capture.
- Capture button writes the 9 classified colors into the current face, advances to the next face.
- After all 6 faces: stop tracks, navigate to `/solution` with the assembled state (already wired, just confirm the F/R/U/D/L/B → up/right/front/down/left/back mapping).
- Fallbacks for denied/unsupported with a clear "Use manual input instead" link.

## 4. 3D cube rotation rebuild

The current cube glitches and mixes colors because the rotating group and the cubie state get out of sync. Rebuild around one strict contract:

- **Single source of truth**: a 3x3x3 array of cubie objects, each with a position vector and an orientation quaternion. Stickers are children of cubies.
- **executeMove(face, dir)** is the only function allowed to change cube state. It:
  1. Selects the 9 cubies on that face by position.
  2. Re-parents them under a temporary `THREE.Group`.
  3. Animates the group's rotation 0 → ±90° around the face axis (duration based on global speed setting).
  4. On animation end: bakes the rotation into each cubie's position+quaternion (snapped to the nearest 90°), re-parents back to the scene root, deletes the group.
- A small move queue prevents overlapping animations (queue the next move, don't fire mid-rotation). This kills the color-mixing glitch.
- Real-cube look: matte black body, WCA sticker palette, inset stickers with visible black gaps.
- Inputs (already partly there) get cleaned: keyboard (R U L D F B + Shift for prime), on-screen N/E/W/S/+ pad, swipe gestures. All three go through `executeMove` only.

## 5. Solution dashboard with full controls

Rebuild `/solution` as the "watch it solve" screen:

- Top: 3D cube seeded with the user's scrambled state.
- Below cube: the move list (Singmaster) with the current move highlighted and a progress bar.
- Control bar (the "full control" you asked for):
  - **Prev** · **Play / Pause** · **Next** · **Reset**
  - Speed presets: **Slow · Normal · Fast** (saved to global settings, persisted in localStorage).
  - Optional fine-grain speed slider above the presets.
- Play applies moves through the same `executeMove` queue with a delay between each move tied to the speed preset. Pause stops at the current move. Prev replays the inverse of the last move. Reset re-seeds the scrambled state and rewinds the move pointer to 0.
- If Kociemba returns an error (invalid centers, parity), show a friendly card: "We couldn't read this cube. Edit colors" → opens manual input prefilled with the scanned state.

## 6. Settings + global speed

- `/settings` exposes: animation speed (slow/normal/fast), idle auto-rotate on/off, theme, sign out.
- Already persisted via `CubeSettingsContext` → just make sure Solution and Solver both read from it.

## Technical notes

- Files touched (rewrites): `src/pages/Home.tsx`, `src/pages/ManualInput.tsx`, `src/pages/CameraInput.tsx`, `src/pages/Solution.tsx`, `src/components/CubeRenderer3D.tsx`, `src/components/BottomNav.tsx`, `src/cube/CubeProvider.tsx` (move queue), `src/hooks/useCamera.ts` (gesture-gated start).
- Files added: `src/components/SolutionPlaybackBar.tsx`, `src/components/ManualFaceEditor.tsx`, `src/components/CubeNetPreview.tsx`, `src/components/LiveColorReadout.tsx`.
- Existing solver (`kociembaSolver`, `CubeModel.fromFaceArrays`) stays — only the wiring around it changes.
- Tests: extend `CubeModel.test` and `AnimationController.test` to cover the new move queue (no overlapping rotations, state matches mesh after every move).

## Out of scope (this round)

- Auth provider changes (we keep current sign-in).
- Premium/payments, Collection, Play levels, gamification — left in code but hidden.
- 4x4+ puzzles — 3x3 only for this fix.
