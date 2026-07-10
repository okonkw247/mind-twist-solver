## Scope
Only touch `/virtual-cube` (`src/pages/VirtualCube.tsx`) and the way `CubeRenderer3D` is used there. No other pages, no solver/logic changes.

## Problems on /virtual-cube today
1. The cube is rendered small and off-center — `size={320}` on a full-screen stage, with the parent using `radial-gradient` background. It looks floating and cramped on desktop viewports (990×650 in the screenshot).
2. `enableInputs={false}` is hard-coded, so the user cannot turn faces with their hand — only orbit the camera. The user explicitly wants hand-driven face turns.
3. Because both `OrbitControls` and swipe-to-turn share the same pointer stream, enabling swipes naively will conflict with camera orbit (every drag becomes a face turn).

## Fix plan

### 1. Render the cube properly in the stage
- Make the canvas fill the available stage area instead of a fixed 320px box: pass a responsive size (e.g. `min(stageWidth, stageHeight) * 0.9`) measured via a `ResizeObserver`, or switch `CubeRenderer3D` usage here to a full-bleed wrapper.
- Keep the existing dark radial background, but center the cube and give it real breathing room so all three visible faces are clearly framed.

### 2. Enable hand rotation of faces (the core ask)
- Turn inputs on: `enableInputs={true}`.
- Resolve the orbit-vs-turn conflict with a clear two-mode gesture model:
  - **One-finger drag / left-mouse drag on the cube** → face turn (swipe up/down/left/right → R / R' / U / U', matching the existing logic in `CubeRenderer3D`).
  - **Two-finger drag / right-mouse drag / drag on empty background** → orbit camera.
  - Mouse wheel / pinch → zoom (already handled by OrbitControls).
- Implementation approach inside `CubeRenderer3D` usage on this page only:
  - Disable `OrbitControls` one-finger rotate (`touches.ONE = THREE.TOUCH.PAN` off, use `TWO: ROTATE`), and set `mouseButtons` so left = none, right = rotate. Swipe handler on the wrapper div then owns single-pointer gestures for face turns.
  - Keep pinch-zoom via `TWO: DOLLY_PAN`.
- Raise swipe threshold slightly (e.g. 24 px) and add a small "tap = ignore" deadzone so accidental taps don't fire a turn.

### 3. Small UX touches (still only this page)
- Add a one-line hint under the header: "Drag with one finger to turn a face · two fingers to rotate the cube".
- Keep Scramble / Solve / Reset buttons and the timer strip exactly as they are.

## Technical notes
- All changes live in `src/pages/VirtualCube.tsx`. If the gesture-mode split can't be done cleanly from the outside, add a minimal `gestureMode?: 'turn' | 'orbit' | 'hybrid'` prop to `CubeRenderer3D` (default `'hybrid'`) that configures OrbitControls' `touches` / `mouseButtons` and the internal swipe handler accordingly — no behavior change for any other page.
- No changes to `CubeModel`, `AnimationController`, `CubeProvider`, solver, or any other page.
- No new dependencies.

## Out of scope
- Camera page, manual input, solver, solution playback, settings, styling of other pages.
- Cube materials/colors (already the WCA palette per project memory).
