# Google Fonts DB API

A single Hono app deployed on Vercel that serves a catalog of Google Fonts: font listings, categories, designers, licenses, subsets, and search, plus font preview images (SVG/PNG/WebP).

## Prerequisites

- [Vercel CLI](https://vercel.com/docs/cli) installed globally
- [pnpm](https://pnpm.io/installation) installed globally

## Develop locally

```
pnpm install
vc dev
```

```
open http://localhost:3000
```

## Build locally

```
pnpm install
vc build
```

## Deploy

```
pnpm install
vc deploy
```

## API

All routes are mounted from `src/index.ts`. Many are still scaffolds returning placeholder text.

| Route | Description |
|---|---|
| `GET /fonts` | List all fonts |
| `GET /fonts/:font` | Get a font by id |
| `GET /fonts/search/:query` | Search fonts |
| `GET /fonts/:font/svg?style=` | SVG preview (redirect) |
| `GET /fonts/:font/png?style=` | PNG preview (redirect) |
| `GET /fonts/:font/webp?style=` | WebP preview (redirect) |
| `GET /categories`, `GET /categories/:category` | List / get category |
| `GET /designers`, `GET /designers/:designer` | List / get designer |
| `GET /licenses`, `GET /licenses/:license` | List / get license |
| `GET /subsets`, `GET /subsets/:subset` | List / get subset |
| `GET /health` | Health check, returns `OK` |
| `GET /stats` | Aggregate catalog stats |

## Data & scripts

- Catalog data lives in `src/data/*.json` (`fonts.json`, `families.json`, `categories.json`, `subsets.json`, `stats.json`, plus `.compact` variants).
- Data is generated and processed by `src/scripts/*.ts`; each has a plan in `docs/*.md`. Run them with `npx tsx src/scripts/<name>.ts` (there are no `package.json` scripts).
- Font preview images are served from `public/fonts/<id>/{svg,png,webp}`.
- `src/db/schema.sqlite` holds the SQLite schema; `src/scripts/import-fonts-db.ts` loads `fonts.json` into Turso (requires `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in `.env`).
