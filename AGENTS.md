# AGENTS.md

## Layout

- The real project lives in the nested `google-fonts-db-api/` directory; the parent folder is only a container and is not a git repo. Run all commands from `google-fonts-db-api/`.
- Single Hono app deployed on Vercel. Sole entrypoint: `src/index.ts` (default-exports the `Hono` app). No `vercel.json`; Vercel auto-detects.
- Routes: `src/fonts/*` (`search`, `svg`, `png`, `webp` + list/get by id), plus `src/categories.ts`, `src/designers.ts`, `src/lecenses.ts` (serves `/licenses`), `src/subsets.ts`, and top-level `/health`, `/stats` in `src/index.ts`. Many handlers are still scaffolds.
- Data lives in `src/data/*.json` (`fonts.json`, `families.json`, `categories.json`, `subsets.json`, `stats.json`, plus `.compact` variants).
- Data generation/processing scripts live in `src/scripts/*.ts`; each has a plan in `docs/*.md`.
- Font preview images are served statically from `public/fonts/<id>/{svg,png,webp}`.
- `src/db/schema.sqlite` holds the SQLite schema used by `src/scripts/import-fonts-db.ts` (Turso/libsql). `import-fonts-db.ts` also depends on a `git-clone/fonts` checkout of `github.com/google/fonts` (used by `organize-fonts.ts`).

## Commands

- There are **no scripts in `package.json`** — `npm run dev`, `npm test`, etc. don't exist. Don't guess them.
- Dev / build / deploy all go through the Vercel CLI (requires `vc` installed globally):
  - `vc dev` → local server at `http://localhost:3000`
  - `vc build`, `vc deploy` for build/deploy
- Package manager is **pnpm** (`pnpm-lock.yaml`, `pnpm-workspace.yaml`) — use `pnpm install` to stay consistent with the lockfile.
- `tsx` is installed to run TS snippets ad hoc (e.g. `npx tsx src/scripts/extract-families.ts`), but it is not wired into any script.

## Gotchas

- `src/lecenses.ts` is a typo (should be `licenses.ts`) but it is the file that serves the `/licenses` route — don't rename it without updating `src/index.ts`.
- `GET /stats` in `src/index.ts` reads `./stats.json` relative to cwd, but the real file is `src/data/stats.json` — the path is likely wrong at runtime.
- `tsconfig.json`: `module: NodeNext`, `strict`, `jsx: react-jsx` with `jsxImportSource: hono/jsx`, `rootDir: ./src`, `outDir: ./dist` — write UI via Hono JSX in `.tsx` files, not React.
- TypeScript is the native TS 7 compiler (`typescript@7.0.2`). No `typecheck`/`build` script exists; use `npx tsc --noEmit` to typecheck.
- `.env` is gitignored and required by `src/scripts/import-fonts-db.ts` (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`).
- `.vercel/` is gitignored; per-project Vercel state stays local.
