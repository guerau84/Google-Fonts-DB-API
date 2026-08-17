# Google Fonts DB API

A REST API for browsing and searching the Google Fonts catalog, built with [Hono](https://hono.dev/) and deployed to [Netlify](https://www.netlify.com/). Font metadata is mirrored to a [Turso](https://turso.tech) (libSQL) database (queried by the fonts/search/designers/licenses endpoints), while categories, subsets and stats are served directly from generated JSON data. Everything is kept in sync with the upstream [`google/fonts`](https://github.com/google/fonts) repository via a scheduled GitHub Action.

## Tech Stack

- **Hono** — edge-friendly HTTP framework
- **Turso / libSQL** — serverless SQLite database (reads)
- **Netlify** — hosting / serverless deployment
- **opentype.js, woff2-encoder, sharp** — font parsing and preview image generation
- **GitHub Actions** — automated catalog updates

## Requirements

- A [Netlify](https://www.netlify.com/) account with your site linked to this repository
- [Netlify CLI](https://docs.netlify.com/cli/get-started/) installed globally
- [pnpm](https://pnpm.io/installation) installed globally

## Setup

Install dependencies:

```
pnpm install
```

Create a `.env` file in the project root with Turso credentials (used by `src/db/client.ts`):

```
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
TURSO_AUTH_TOKEN_READ_ONLY=...
```

## Commands

### Develop locally

```
pnpm install
ntl dev
```

```
open http://localhost:8888
```

### Build locally

```
pnpm install
ntl build
```

### Deploy

Deploy to production from a local checkout:

```
pnpm install
ntl deploy --prod
```

### Update the font database

Regenerate the JSON data files, previews, and the Turso database from a local checkout of `google/fonts` (expected at `../google-fonts`):

```
pnpm run update-fonts
```

This runs `src/scripts/update.ts`, which parses each family's `METADATA.pb`, generates SVG/PNG/WebP previews, and pushes new records to Turso.

## API Reference

Base URL: `/` (e.g. `http://localhost:8888`)

### Fonts

#### List fonts

```
GET /fonts?page=1&limit=20
```

Query params:
- `page` — page number (default `1`)
- `limit` — results per page, max `100` (default `20`)

Response:
```json
{
  "page": 1,
  "limit": 20,
  "total": 20,
  "results": [ { "id": "roboto", "family": "Roboto", ... } ]
}
```

#### Get a single font

```
GET /fonts/:font
```

`:font` is the font id (lowercase, spaces replaced with `-`, without accents), e.g. `/fonts/roboto`.

#### Search fonts

```
GET /fonts/search/:query?limit=20&page=1
```

Additional filters (all optional):
- `category` — e.g. `sans-serif`
- `designer` — e.g. `roboto`
- `license` — e.g. `OFL`
- `subset` — e.g. `latin`

#### Font preview assets

```
GET /fonts/:font/svg
GET /fonts/:font/png
GET /fonts/:font/webp
```

Each redirects to the generated preview image for the font (currently redirects to the `regular` style). An optional `style` query param is accepted for future multi-style support.

### Categories

```
GET /categories
GET /categories/:category
```

`/categories` returns the list of category slugs. `/categories/:category` returns full details (id, name, count, and font families) for a category.

### Subsets

```
GET /subsets
GET /subsets/:subsetId
```

`/subsets` returns the list of subset slugs. `/subsets/:subsetId` returns full details for a subset.

### Designers

```
GET /designers
GET /designers/:designer
```

`/designers` returns the list of unique designer names. `/designers/:designer` returns all fonts by a designer.

### Licenses

```
GET /licenses
GET /licenses/:licenseId?page=1&limit=20
```

`/licenses` returns the list of unique licenses (E.g. `OFL`, `Apache`, `UFL`). `/licenses/:licenseId` returns the fonts released under that license.

### Stats

```
GET /stats
```

Returns aggregate statistics over the whole catalog (font counts per category, subset, weight, and axis, variable font share, etc.).

### Health

```
GET /health
```

Returns `OK` (always).

```
GET /ready
```

Returns service readiness, including database connectivity.

## Data Model

Each font record (see `src/interfaces/fonts.interface.ts`) contains:

| Field       | Description |
| ----------- | ----------- |
| `id`        | Slugified font id |
| `family`    | Font family name |
| `category`  | e.g. `sans-serif`, `serif`, `display`, `handwriting`, `monospace` |
| `designer`  | Designer object (`{ name }`) |
| `license`   | e.g. `OFL`, `Apache`, `UFL` |
| `dateAdded` | Date the font was added |
| `subsets`   | Supported subsets (e.g. `latin`, `cyrillic`) |
| `styles`    | Styles (e.g. `normal`, `italic`) |
| `weights`   | Available font weights |
| `variable`  | Whether the font is a variable font |
| `axes`      | Variable font axes with their min/max ranges |
| `links`     | Google Fonts specimen and source repository URLs |
| `css`       | Google Fonts CSS endpoint URL |
| `previews`  | SVG / PNG / WebP preview-image redirect paths |

## Project Structure

```
src/
  index.ts            # App entry point, top-level route mounting
  categories.ts       # /categories routes (served from JSON)
  designers.ts        # /designers routes (Turso reads)
  licenses.ts         # /licenses routes (Turso reads)
  subsets.ts          # /subsets routes (served from JSON)
  fonts/
    index.ts          # /fonts list (Turso reads)
    search.ts         # /fonts/search routes (Turso reads)
    svg.ts            # /fonts/:font/svg redirects (static previews)
    png.ts            # /fonts/:font/png redirects (static previews)
    webp.ts           # /fonts/:font/webp redirects (static previews)
  data/               # Generated JSON data files (do not hand-edit)
    fonts.json, families.json, stats.json
    categories.json, categories.compact.json
    subsets.json, subsets.compact.json, workflow-state.json
  db/client.ts        # Turso (libSQL) read / read-write clients
  interfaces/         # TypeScript type definitions
  lib/parser.ts       # METADATA.pb parsing
  scripts/
    update.ts         # End-to-end catalog update entry point
    update-db.ts      # Push records into the Turso database
    generate-preview.ts # SVG/PNG/WebP preview generation
public/fonts/         # Generated preview images
```

## Automated Updates

A [GitHub Action](.github/workflows/update-fonts.yml) runs daily (`0 0 * * *`) and can also be triggered manually. It:
1. Clones the upstream `google/fonts` repository
2. Detects changes since the last run (tracked in `src/data/workflow-state.json`)
3. When changes exist, regenerates metadata JSON, previews, and the Turso database (`npx tsx src/scripts/update.ts`)
4. Commits the updated `src/data` and `public/fonts`

## License

[MIT](LICENSE)