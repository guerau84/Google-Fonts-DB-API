# Plan: `generate-previews.ts` — Rasterize previews for every font in `src/data/fonts.json`

## Context

- Source: `src/data/fonts.json` (array of **2022** fonts). The task text says `/data/fonts.json`; the real path is `src/data/fonts.json` (same as in the other `docs/*.md` plans).
- Target: static preview assets under `public/fonts/`, mirroring the `previews` field already present in each font entry (e.g. `fonts/42dot-sans/svg`, `fonts/42dot-sans/png`, `fonts/42dot-sans/webp`).
- Seed code (provided by the task): a `generatePreview(fontCssUrl, fontName, outputPath)` function that fetches the Google Fonts CSS, extracts the **latin** woff2, decompresses it to sfnt, draws the family name with `opentype.js`, and renders **svg + png + webp** with `sharp`.
- This task only delivers this plan MD. The implementation is left for the next one.
- The API modules (`src/fonts/*`, etc.) are not modified; only new script + generated assets.

## Data notes (verified against `fonts.json`)

| Field | Example | Purpose |
|---|---|---|
| `id` | `42dot-sans` | Output folder + filename id (`spaces → -`, lowercase) |
| `family` | `42dot Sans` | Text rendered on the preview |
| `styles` | `["normal"]` | Which variant previews to render |
| `weights` | `[400]` | Weight to pick when the CSS serves multiple files |
| `css.url` | `https://fonts.googleapis.com/css2?family=42dot+Sans:wght@300..800&display=swap` | CSS to fetch |
| `previews` | `fonts/42dot-sans/svg`, `/png`, `/webp` | Relative output dirs under `public/` |

- CSS variants observed: static (`family=Abel&display=swap`), variable 1-axis (`:wght@300..800`), variable multi-axis (`Bitcount:CRSV@0..1;ELSH@0..100;...`). The fetched CSS always contains a `/* latin */` block with a `woff2` `url(...)` pointing to `fonts.gstatic.com` (absolute URL) — the seed regex targets exactly that block.
- `public/fonts/{svg,png,webp}` exist but are **empty scaffolds**; there is no `public/fonts/<id>/` yet.

## Confirmed decisions

| Point | Decision |
|---|---|
| Script path | `src/scripts/generate-previews.ts` (matches `src/scripts/*.ts` convention) |
| Output root | `public/fonts/<id>/<format>/<id>, <style>.<ext>` (aligns with `previews` field + seed naming `42dot-sans, regular`) |
| Style label | `regular` for `normal`, `italic` for `italic` (seed renders `(regular)`; keep per-style) |
| Text rendered | `"<family> (<style>)"` at size 72, y=100 — same as seed |
| Source font for `opentype.parse` | First woff2 in the `/* latin */` block (regex from seed) |
| Failed fonts | Log warning + continue; end with a summary of skipped ids |
| Concurrency | Bounded worker pool (e.g. 4–8 concurrent fonts) — 2022 × 3 HTTP+fetch+raster ops must not run unbounded |
| New deps | `opentype.js`, `sharp`, `woff2-encoder` (seed imports; none are in `package.json` today) — must be installed with **pnpm** |

> Note: `woff2-encoder` is used only for `decompress(woff2) → sfnt ArrayBuffer`. If the package name resolves differently at install time, fall back to `@gfx/woff2-encoder` or `fonteditor-core`'s woff2 decoder; the plan's contract is only "decompress woff2 → sfnt".

## Pipeline (per font)

1. **Load** `src/data/fonts.json` → array of font entries.
2. **Fetch CSS** `font.css.url`, read as text.
3. **Extract latin woff2 URL** with seed regex:
   ```ts
   const match = css.match(/\/\*\s*latin\s*\*\/[\s\S]*?url\(["']?(.*?)["']?\)/)
   ```
   If no match → mark font failed (skip).
4. **Fetch** the woff2 as `ArrayBuffer`.
5. **Decompress** → sfnt bytes: `decompress(woff2ArrayBuffer)`.
6. **Parse** with `opentype.parse(sfnt)`.
7. **Draw path**: `font.getPath(\`${family} (${styleLabel})\`, 0, 100, 72)` → `path.toPathData(2)`.
8. **Build SVG** (same template as seed: `viewBox="0 0 800 150"`, black path).
   - Long family names may overflow 800px — optional auto-measure via `font.getAdvanceWidth` and scale/center the path inside the viewBox (keep the fixed 800×150 canvas to match the seed otherwise).
9. **Rasterize** with `sharp`:
   - `sharp(Buffer.from(svg)).png().toFile(<png>)`
   - `sharp(Buffer.from(svg)).webp().toFile(<webp>)`
   - `writeFile(<svg>, svg)`
10. **Ensure** `public/fonts/<id>/{svg,png,webp}` exist before writing (`mkdir` recursive).

## Implementation notes

- Follow `src/scripts/extract-*.ts` conventions: top-level ESM (`"type": "module"`), `node:fs/promises` + `node:path` + `node:url` helpers, `main()` invoked at the bottom.
- No new `package.json` scripts — run with `npx tsx src/scripts/generate-previews.ts`.
- Bounded concurrency: small helper that runs N fonts at a time (e.g. `p-limit`-style, or a hand-rolled pool — prefer hand-rolled to avoid another dep).
- Logging: `Total`, `ok`, `skipped` counts + the list of failed `id`s at the end.
- Consider a `--limit <n>` flag (parse `process.argv`) to smoke-test on a few fonts before running all 2022.
- Idempotency: rerunning should overwrite files in place (regenerating is the intent, not merging).

## Verification

- `npx tsc --noEmit` (typecheck; no build script exists).
- Smoke run: `npx tsx src/scripts/generate-previews.ts --limit 3` → check `public/fonts/42dot-sans/{svg,png,webp}/42dot-sans, regular.svg|png|webp` exist and are valid (open the PNG/WEBP; svg contains a single black `<path>`).
- Full run over all 2022 → summary shows `ok == 2022` minus genuine failures (e.g. fonts whose CSS has no latin woff2).
- Spot-checks: `abel` (static CSS), `42dot-sans` (variable 1-axis), `bitcount` (variable multi-axis) — all three CSS shapes must produce previews.

## Deliverable

- New file `docs/generate-previews.md` (this documented plan).
- Implementation of `src/scripts/generate-previews.ts`.
- Populated `public/fonts/<id>/{svg,png,webp}/<id>, <style>.<ext>` for all fonts.
- Updated `package.json` (+ `opentype.js`, `sharp`, `woff2-encoder` via `pnpm`).
