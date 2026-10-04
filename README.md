# The Analyst

A satirical incremental/management game about corporate data work. Balance **Perceived Understanding (PU)** and **True Understanding (TU)** while dealing with data growth, storage, corporate requests, meetings, markets, upgrades and increasingly absurd analyst work.

> **A visual representation of corporate software. The actual version is somehow worse.**

## Play

GitHub Pages deployment target: [The Analyst](https://alleyfoo.github.io/The-analyst/).

The Pages workflow deploys pushes to `master` and can be run manually. This URL is a deployment target; a successful Pages deployment has not yet been confirmed. Publishing requires GitHub Pages to use GitHub Actions as its source.

## About the game

Start with spreadsheet software, clean incoming data and turn it into metrics. Buy automation and storage upgrades, build a dashboard, answer chat requests and meet the board's growth targets while the raw-data buffer keeps filling. Marketing campaigns and stock trading add more ways to generate perceived value.

**PU** measures how impressive your work looks to management and doubles as a spending currency. **TU** represents actual understanding, supported by better-quality metrics and honest responses. Let appearances run too far ahead of understanding and system entropy can rise.

Progression follows resource thresholds, upgrades and the implemented AI rollout/governance sequence. The quiet Project: OMNISCIENCE book finale unlocks after at least one New Game+ and stabilized governance in the current run. New Game+ remains a separate option.

## Minigames

The repository implements deliberately gamified activities:

- **Spaghetti Mode:** manually normalize messy values into explicit target formats; tangled connections straighten as records become clean.
- **Schema mapping:** match messy column names to a cleaner schema.
- **Ad-hoc SQL queries:** assemble query fragments to satisfy a request.
- **Manual PDF extraction:** select tables while avoiding image noise.
- **Data-flow modelling:** route useful data and discard noise.
- **Process mining:** inspect case traces and wait times to identify a bottleneck and abnormal route.
- **Model training:** adjust a fitting curve and compare training with validation results.
- **Buzzword battles:** identify real technical terms while challenging a rival analyst.

These are playful abstractions, not technically accurate professional simulators. Some existing unlock quirks limit access to implemented activities, including model training; see [known quirks](docs/project/KNOWN_QUIRKS.md).

## Running locally

Prerequisite: **Node.js** with npm.

```sh
npm install
npm run dev
```

Vite prints the local URL to open in your browser. For installation from the committed dependency snapshot, use `npm ci` instead of `npm install`.

Build the game and run the existing TypeScript check:

```sh
npm run build
npm run lint
```

The `lint` script runs `tsc --noEmit`.

## Technical overview

Built with **React 19**, **TypeScript** and **Vite**. The game runs client-side in the browser, saves progress to **localStorage**, and requires no backend or API key. Presentation uses CDN-loaded styling and fonts.

For the detailed baseline architecture, gameplay and state documentation, see [docs/project/INDEX.md](docs/project/INDEX.md).

## Current status

The repository contains a complete playable game, including the implemented AI rollout/governance expansion and recent minigame clarity improvements. GitHub Pages deployment is prepared through `.github/workflows/deploy-pages.yml`; public availability remains unconfirmed. Existing behavior and known quirks are documented.

## Development principle

Treat the existing working game as the baseline. New development should extend it with deliberate boundaries rather than casually rewrite its systems or behavior.

---

The minigames are simplified, satirical representations of real corporate/data systems. They are not professional training material. The actual versions are, somehow, worse.
