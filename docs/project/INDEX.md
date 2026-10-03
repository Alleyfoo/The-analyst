# Existing baseline documentation

These files describe the **existing implementation**, preserved in baseline commit `1263845279e9afd65ac05a6a1ac809e9bc70ee3c`. They are authoritative only for that current implementation, not a feature specification or a claim that every advertised path is reachable. Source code takes precedence; no production source was changed for this audit.

- [CURRENT_SYSTEM.md](CURRENT_SYSTEM.md): runtime, components, update loop and persistence.
- [GAMEPLAY_MAP.md](GAMEPLAY_MAP.md): actual progression, unlocks and consequences.
- [STATE_MODEL.md](STATE_MODEL.md): complete central state inventory and derived data.
- [KNOWN_QUIRKS.md](KNOWN_QUIRKS.md): confirmed logic defects, discrepancies and open concerns.
- [EXTENSION_BOUNDARIES.md](EXTENSION_BOUNDARIES.md): existing seams for later work, without an expansion design.

Evidence names repository-relative source paths and functions/components. Inspection covered every tracked baseline file: root source/configuration/README plus all 20 components and `hooks/useGameEngine.ts`. `.env.local` was identified as private and excluded; its contents were not read.

Validation on 2026-10-03: `npm run build` reaches `vite build` but fails because `vite` is unavailable; `npm run lint` reaches `tsc --noEmit` but fails because `tsc` is unavailable. There is no `test` script, test suite or lockfile in this snapshot. No dependencies were installed, and no end-to-end playthrough was performed. Findings below are source-based, not runtime reproductions.
