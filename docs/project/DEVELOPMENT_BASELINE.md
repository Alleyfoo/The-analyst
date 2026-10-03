# Reproducible development baseline

Validated 2026-10-03 against production source identical to `1263845279e9afd65ac05a6a1ac809e9bc70ee3c`. This pass adds a dependency snapshot and validation records only.

## Package manager and commands

Repository evidence: `README.md` instructs `npm install` and `npm run dev`; `package.json` defines `dev`, `build`, `preview` and `lint`. No lockfile or packageManager field existed before this pass. Used npm **11.12.1** with Node **24.14.1** on Windows. Initial `npm install` used unchanged declarations and created `package-lock.json` (lockfile version 3). It installed 112 packages and reported zero audit vulnerabilities at that time.

For a fresh checkout, use the retained lockfile:

```sh
npm ci
npm run build
npm run lint
npm run dev -- --host 127.0.0.1
```

`npm ci` is the lockfile-based follow-up command; the initial install tested here was `npm install`. `lint` is actually TypeScript checking (`tsc --noEmit`), not a separate stylistic linter. There is no test script. `preview` is defined but was not needed for the development smoke. Do not use dependency-upgrade commands to reproduce this snapshot.

| Declared package | Locked installed version |
| --- | --- |
| clsx | 2.1.1 |
| react / react-dom | 19.3.0 / 19.3.0 |
| framer-motion | 12.43.0 |
| recharts | 3.10.1 |
| lucide-react | 0.556.0 |
| @types/node | 22.20.5 |
| @vitejs/plugin-react | 5.2.0 |
| typescript | 5.8.3 |
| vite | 6.4.3 |

These versions are resolutions within the existing ranges, not edited dependency declarations. The lockfile also captures transitive and optional platform dependencies. `node_modules`, `dist` and `.env.local` remain ignored. No API credentials were read or added; the existing config/unused Gemini substitutions were preserved.

## Results and limits

- Build: passed, exit 0; missing `/index.css` and large-bundle warnings recorded in [KNOWN_QUIRKS.md](KNOWN_QUIRKS.md).
- Typecheck: passed, exit 0.
- Launch: existing dev script started Vite successfully at `http://127.0.0.1:3000/`; server stopped after the smoke.
- Runtime: passed using the already-installed Playwright skill and headless Chromium, with a fresh isolated browser context at 1440x1000. Initial game and primary controls were visible; no immediate uncaught runtime or console error. Autosave initialized valid JSON and reload restored it and resumed ticking. Only the Tailwind CDN production-use warning was captured.

The temporary smoke script was outside the project and is not a new repository test suite or dependency. No production source changed. No rebalance, minigame playthrough, endgame check, production-preview smoke or exhaustive browser compatibility check was performed. Existing gameplay issues remain documented and unfixed.
