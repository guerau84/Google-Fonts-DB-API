# Plan: `organize-fonts.ts` — Generate `src/data/fonts.json`

## Context

- The real project lives in `C:\Users\...\google-fonts-db-API\google-fonts-db-api` (working root). Actual paths: script in `src/scripts/organize-fonts.ts`, output in `src/data/fonts.json`.
- `git-clone/fonts` is a clone of `github.com/google/fonts` (submodule without `.gitmodules`, remote `origin`).
- Directories by license: `git-clone/fonts/{apache,ofl,ufl}` → **2047 font folders** (`ofl` 1998, `ufl` 5, `apache` 44).
- `organize-fonts.ts` and `fonts.json` are **empty** (scaffolds).
- Data sources: each folder contains `METADATA.pb` (proto-text). **25 folders have no `METADATA.pb`** → they are skipped.
- The API modules (`src/fonts/*`, `src/categories.ts`, etc.) are scaffolds that do not yet read `fonts.json`; they must not be modified in this task.

## `METADATA.pb` format (relevant)

Fields: `name`, `designer`, `license`, `category`, `date_added`, `fonts {}` blocks, `subsets:`, `source { repository_url }`.

Two distinct `axes` cases:
- **Variable**: **top-level** `axes {}` block (2-space indentation), e.g. Oswald `wght 200..700`, Bitcount (`CRSV, ELSH, ELXP, slnt, wght`).
- **Static**: no top-level `axes` block; only per-instance axes inside `fonts {}` (4-space indentation) — e.g. Abel, Lato.

Conclusion: **variable ⇔ a top-level `axes {` exists**. Indentation must be distinguished so per-instance axes are not confused.

## Confirmed decisions

| Point | Decision |
|---|---|
| `APACHE2` license | Normalize to `"APACHE"` |
| Static font | `"variable": false`, `"axes": []` |
| Multi-axis variable | css2 URL with all axes: `family=Bitcount:CRSV@0..1;ELSH@0..100;...` |
| `id` | Derived from the family `name`: lowercase + spaces → hyphens (`"42dot Sans"` → `"42dot-sans"`) |
| Merge into `fonts.json` | Merge by `id` (idempotent), preserving existing entries |
| Missing `METADATA.pb` | Skip the folder |
| No `repository_url` (19 fonts) | `"repository": ""` |

## Field mapping

| Output field | Source in METADATA.pb | Notes |
|---|---|---|
| `id` | `name` | lowercase, spaces → `-` |
| `family` | `name` | literal |
| `category` | `category` | `SANS_SERIF→sans-serif`, `SERIF→serif`, `DISPLAY→display`, `MONOSPACE→monospace`, `HANDWRITING→handwriting` |
| `designer.name` | `designer` | literal |
| `license` | `license` | `APACHE2→APACHE`, rest literal (`OFL`, `UFL`) |
| `dateAdded` | `date_added` | literal |
| `subsets` | `subsets:` | array |
| `styles` | `fonts[].style` | unique, sorted (`normal` before `italic`) |
| `weights` | `fonts[].weight` | unique, numeric, sorted |
| `variable` | top-level `axes {}` exists | |
| `axes` | top-level `axes {}` | `[{tag, min, max}]`; `[]` if static |
| `links.googleFonts` | `name` | `https://fonts.google.com/specimen/<name with +>` |
| `links.repository` | `source.repository_url` | `""` if missing |
| `css.url` | `name`, `axes`, `variable` | See rules below |
| `previews` | `id` | `fonts/<id>/svg`, `/png`, `/webp` |

### `css.url` rules

- Static: `https://fonts.googleapis.com/css2?family=Abel&display=swap`
- Variable 1 axis: `https://fonts.googleapis.com/css2?family=42dot+Sans:wght@300..800&display=swap`
- Variable multi-axis: `https://fonts.googleapis.com/css2?family=Bitcount:CRSV@0..1;ELSH@0..100;ELXP@0..100;slnt@-8..0;wght@100..900&display=swap`
  - Axis order: order of appearance in the pb (or alphabetical, fixed).
  - Family with spaces → `+`.

## Implementation in `src/scripts/organize-fonts.ts`

1. **Path constants** (resolve relative to the repo root):
   - `GIT_CLONE = git-clone/fonts`
   - `OUT = src/data/fonts.json`
   - `LICENSE_DIRS = ['apache', 'ofl', 'ufl']`
2. **METADATA.pb parser** (regex, no new libraries; only `node:fs/promises`):
   - Function `parseMetadata(raw)` to extract: `name`, `designer`, `license`, `category`, `date_added`, list of `fonts {}` (style/weight), `subsets`, top-level `axes` (2 spaces), `repository_url`.
   - Watch out for: copyright with escaped quotes, `\n` in strings, multiple `fonts {}` blocks.
3. **Mapper** `buildFontEntry(dirName, pb) → object` with the table mapping + normalizations + URL generation.
4. **Merge**:
   - `readFile` of `fonts.json` (if it exists / is valid) → `Map` by `id`.
   - Add/update new entries. If the file is empty/corrupt, start from `[]`.
   - `writeFile` with `JSON.stringify(entries, null, 2)` + trailing newline.
5. **Logging**: console with total processed, skipped (no `METADATA.pb`) and fonts without `repository_url`.
6. **Entrypoint**: `main()` with `await`, top-level ESM (the project is `"type": "module"`), no changes required in `package.json` (it runs with `npx tsx src/scripts/organize-fonts.ts`).

## Verification

- `npx tsc --noEmit` (typecheck; there is no build script).
- Run `npx tsx src/scripts/organize-fonts.ts` and check:
  - `src/data/fonts.json` is a valid JSON array with ~2022 entries.
  - Spot-checks: `42dot Sans` (id `42dot-sans`, variable, OFL), `Abel` (static, `axes: []`), `Chewy` (`APACHE` license), `Bitcount` (multi-axis), `Ubuntu` (UFL, static, weights `[300,400,500,700]`).
  - Run twice → same result (merge idempotency).

## Deliverable

- New file `docs/organize-fonts.md` (this documented plan).
- Implementation of `src/scripts/organize-fonts.ts`.
- Populated `src/data/fonts.json`.
