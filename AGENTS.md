# AGENTS.md

## Layout

- This project root **is** the git repo root (no nesting). Run all commands from here.
- Single Hono app deployed on Vercel. Sole entrypoint: `src/index.ts` (default-exports the `Hono` app). No `vercel.json`; Vercel auto-detects.
- App logic is organized under `src/fonts/` (route handlers + font processing) and `src/lib/` (parsing/validation/metadata), with data files under `src/data/` and maintenance scripts under `src/scripts/`.

## Commands

- **Only one script exists in `package.json`:** `dev` (`tsx watch src/index.ts`). There is no `test`, `build`, or `typecheck` script — don't guess them.
- Dev / build / deploy go through the Vercel CLI (requires `vc` installed globally):
  - `vc dev` → local server at `http://localhost:3000`
  - `vc build`, `vc deploy` for build/deploy
- Package manager is **pnpm** (`pnpm-lock.yaml`, `pnpm-workspace.yaml`) even though README says `npm install` — use `pnpm install` to stay consistent with the lockfile.
- `tsx` is available for running ad-hoc TS snippets (e.g. `npx tsx src/scripts/update-db.ts`). Useful for running the maintenance scripts in `src/scripts/`.

## Gotchas

- TypeScript is the native TS 7 compiler (`typescript@7.0.2`). No `typecheck`/`build` script exists; use `npx tsc --noEmit` to typecheck.
- `tsconfig.json`: `module: NodeNext`, `strict`, `jsx: react-jsx` with `jsxImportSource: hono/jsx` — write UI via Hono JSX in `.tsx` files, not React.
- `.vercel/` is gitignored; per-project Vercel state stays local.
- `src/data/*.json` files are generated/updated by the scripts under `src/scripts/` — don't hand-edit them.