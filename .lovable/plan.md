
## Why the cube "rotates that way"

Three things are stacking on top of each other in `CubeRenderer3D` + `Home`:

1. **Tilted parent group.** The whole cube lives inside `<group rotation={[0.4, -0.5, 0]}>`. The rotating-layer `<group>` is a *child* of that tilt, so when a face turns around world `x/y/z`, the visible axis is the tilted axis — rotations look diagonal / off-kilter.
2. **Auto-scramble on every Home mount.** `Home.tsx` fires 8 fast scramble moves the moment the page loads, so what the user sees on `/home` is a continuous scrambling animation, not a clean idle cube.
3. **OrbitControls is fully enabled** on the small Home preview, so any drag tilts the camera and compounds the effect.

## Plan

### 1. Fix rotation behavior (`src/components/CubeRenderer3D.tsx`)

- Move the `rotation={[0.4, -0.5, 0]}` tilt to a *wrapper* group, and make `staticCubies` + `rotatingGroupRef` siblings of a properly oriented parent so face-turn axes stay aligned with the cube faces (axis vectors get transformed correctly because the rotating group is at the same level as the static cubies, both inside the same tilted parent — but the axis is applied in the parent's local space, which already matches the cube's local axes; the visual oddness comes from the *additional* `rotation` on the inner group affecting only `staticCubies` baseline. We'll restructure so both groups receive the same baseline orientation and the layer rotation is applied in cube-local space.)
- Add an `interactive` prop (default `true`). When `false` (Home), disable OrbitControls so the cube doesn't drift when users tap the card.
- Add an optional `autoRotateIdle` prop: when no animation is running and `interactive=false`, gently rotate the whole cube on Y at ~0.2 rad/s for an "attract" effect (replaces the scramble-on-mount feel).

### 2. Stop the chaotic auto-scramble on Home (`src/pages/Home.tsx`)

- Remove the `useEffect` that enqueues 8 scramble moves on mount.
- Pass `interactive={false}` and `autoRotateIdle` to `CubeRenderer3D` so the Home cube just slowly spins like a hero asset, while `/solver`, `/play-cube`, `/solution` keep full interaction.

### 3. Upgrade visuals to a real Rubik's-cube design (`src/components/CubeRenderer3D.tsx`)

- **Body:** pure black matte plastic — `MeshStandardMaterial { color: '#0a0a0a', roughness: 0.85, metalness: 0.05 }`.
- **Sticker colors (official WCA palette):**
  - white `#FFFFFF`
  - yellow `#FFD500`
  - red `#C41E3A`
  - orange `#FF5800`
  - blue `#0051BA`
  - green `#009E60`
- **Stickers:** keep `PlaneGeometry` but shrink to `0.82 x 0.82` and inset to `offset = 0.502` so a thin black gap shows around each sticker (the classic cube-grid look). Material: `roughness: 0.45, metalness: 0.0` for a matte vinyl feel.
- **Cubie body:** keep `RoundedBox` but bump `radius` to `0.06` (slightly tighter bevels, closer to a real Speedcube).
- **Lighting:** keep ambient + one key directional, add a soft fill `directionalLight` from the opposite side at intensity `0.35` to remove the very dark shadow side without washing colors out.
- **Canvas:** keep `dpr={[1, 1.5]}` for perf; add `shadows={false}` explicitly to avoid accidental cost.

### 4. Sanity checks

- Run the cube test suite (`AnimationController`, `CubeModel`, `SolverEngine`) — purely visual/material changes, all 41 tests should still pass.
- Manually verify on `/home` (idle slow spin), `/solver` (face turns rotate cleanly around the correct face), `/solution` (animated solve still aligns), `/play-cube`.

## Files touched

- `src/components/CubeRenderer3D.tsx` — palette, materials, sticker insets, `interactive` + `autoRotateIdle` props, group structure fix.
- `src/pages/Home.tsx` — remove auto-scramble effect, pass new props to `CubeRenderer3D`.

## Out of scope

- No changes to `CubeModel`, `AnimationController`, `SolverEngine`, or any logic — purely renderer + Home page behavior.
- Old `RubiksCube3D.tsx` / `RigidCube3D.tsx` are not touched (legacy, unused in current routes).
