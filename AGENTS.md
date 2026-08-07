# AGENTS.md

## Layout

- The real project lives in the nested `google-fonts-db-api/` directory; the parent folder is only a container and is not a git repo. Run all commands from `google-fonts-db-api/`.
- Single Hono app deployed on Vercel. Sole entrypoint: `src/index.ts` (default-exports the `Hono` app). No `vercel.json`; Vercel auto-detects.

## Commands

- There are **no scripts in `package.json`** — `npm run dev`, `npm test`, etc. don't exist. Don't guess them.
- Dev / build / deploy all go through the Vercel CLI (requires `vc` installed globally):
  - `vc dev` → local server at `http://localhost:3000`
  - `vc build`, `vc deploy` for build/deploy
- Package manager is **pnpm** (`pnpm-lock.yaml`, `pnpm-workspace.yaml`) even though README says `npm install` — use `pnpm install` to stay consistent with the lockfile.
- `tsx` is installed if you need to run a TS snippet ad hoc (e.g. `npx tsx src/index.ts`), but it is not wired into any script.

## Gotchas

- `pnpm-workspace.yaml` contains a placeholder line `allowBuilds: esbuild: set this to true or false` that is not a valid value — esbuild's postinstall approval is unresolved. Fix this (`true`/`false`) if installs misbehave.
- `tsconfig.json`: `module: NodeNext`, `strict`, `jsx: react-jsx` with `jsxImportSource: hono/jsx` — write UI via Hono JSX in `.tsx` files, not React.
- TypeScript is the native TS 7 compiler (`typescript@7.0.2`). No `typecheck`/`build` script exists; use `npx tsc --noEmit` to typecheck.
- `.vercel/` is gitignored; per-project Vercel state stays local.
