# Plan: `rename-preview-files.ts` — Rename preview files and delete italic previews

## Context

- Target: static preview assets under `public/fonts/`.
- **Current** layout (verified):
  - `public/fonts/<id>/{png,svg,webp}/<id>, <style>.<ext>`
  - e.g. `public/fonts/42dot-sans/png/42dot-sans, regular.png`
  - e.g. `public/fonts/abeezee/svg/abeezee, italic.svg`
- **Desired** naming: drop the `<id>, ` prefix, keep only `<style>.<ext>`:
  - `public/fonts/<id>/{png,svg,webp}/regular.png|svg|webp`
  - `public/fonts/<id>/{png,svg,webp}/italic.png|svg|webp`
- Additionally, **delete** all existing italic preview files:
  - `public/fonts/<id>/{png,svg,webp}/<id>, italic.png|svg|webp`

## Decision table

| Point | Decision |
|---|---|
| Script path | `src/scripts/rename-preview-files.ts` (matches `src/scripts/*.ts` convention) |
| Formats | `png`, `svg`, `webp` — the three subfolders under each font dir |
| Regular rename | `<id>, regular.<ext>` → `regular.<ext>` |
| Italic handling | Delete `<id>, italic.<ext>` (do **not** rename it) |
| Other files | Skip / leave untouched (defensive; log if any unexpected filename is encountered) |
| Idempotency | Rerunning is safe — after the first run there are no `<id>, ` prefixed files left to match |
| Concurrency | Unnecessary; plain recursive walk is fast (few thousand files) |
| Cron/env | None; run on demand via `tsx` |
| Uses `fonts.json`? | No. Derive the `<id>` prefix from the directory structure itself |

## Pattern matching

Files sit under `public/fonts/<id>/<format>/`. The `<id>` is encoded in the filename as `<id>, <style>.<ext>`. Handle generically by matching the **basename** rather than trusting any single source:

- Match regex running on the basename: `^(.+),\s*(regular|italic)\.(png|svg|webp)$`
- `cap1` = family prefix (ignored, used only as a consistency clue), `cap2` = style, `cap3` = extension.
- Because the output keeps the format extension and the style label, map style + ext directly:
  - `regular` + `png` → destination file `regular.png` inside the same `<format>` folder.
  - `regular` + `svg` → `regular.svg`; `regular` + `webp` → `regular.webp`.
  - `italic` + any ext → delete the file.
- Unexpected basenames (no match) → log a warning and continue.

## Implementation notes

- Follow `src/scripts/extract-*.ts` conventions: top-level ESM (`"type": "module"`), `node:fs/promises` + `node:path`, `main()` invoked at the bottom.
- No new dependencies, no `package.json` scripts — run with `npx tsx src/scripts/rename-preview-files.ts`.
- Use `readdir` along the tree:
  1. `readdir(public/fonts)` with `withFileTypes: true` → font dirs (skip non-directories).
  2. For each font dir, `readdir` its `{png,svg,webp}` subfolders → files.
- Rename via `rename(oldPath, newPath)`; delete via `rm(oldPath)`.
- Logging: tally `renamed` (regular), `deleted` (italic), `skipped`/`warned` (unmatched).

## Script skeleton

```ts
import { readdir, rename, rm } from "node:fs/promises";
import { join } from "node:path";

const FONTS_ROOT = "public/fonts";
const FORMATS = ["png", "svg", "webp"];
const FILE_RE = /^(.+),\s*(regular|italic)\.(png|svg|webp)$/;

async function main() {
  const fontDirs = (await readdir(FONTS_ROOT, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  let renamed = 0;
  let deleted = 0;
  let warned = 0;

  for (const font of fontDirs) {
    for (const fmt of FORMATS) {
      const dir = join(FONTS_ROOT, font, fmt);
      let files: string[];
      try {
        files = await readdir(dir);
      } catch {
        continue; // folder missing
      }
      for (const f of files) {
        const m = f.match(FILE_RE);
        if (!m) {
          warned++;
          console.warn(`[skip] ${join(dir, f)}`);
          continue;
        }
        const style = m[2];
        const ext = m[3];
        if (style === "italic") {
          await rm(join(dir, f));
          deleted++;
        } else {
          await rename(join(dir, f), join(dir, `${style}.${ext}`));
          renamed++;
        }
      }
    }
  }

  console.log(`renamed=${renamed} deleted=${deleted} warned=${warned}`);
}

main();
```

> One detail to confirm during implementation: since `style` is always `regular` for the rename branch (first group `(.+)` is the font prefix, not the style), the destination is literally `regular.<ext>`. The style group is effectively a sentinel for the rename-vs-delete switch.

## Verification

- `npx tsc --noEmit` (typecheck; no build script exists).
- Smoke run on a folder with both variants, e.g. `abel` (regular only) and `abeezee` (regular + italic):
  - `public/fonts/abeezee/{png,svg,webp}/abeezee, italic.*` → gone.
  - `public/fonts/abel/{png,svg,webp}/abel, regular.*` → now `regular.*`.
- Full run: assert no filename under `public/fonts` still matches `, regular` or `, italic`.
- Rerun → warns count = 0 (idempotent) or only logs whatever remains; final state unchanged.

## Deliverable

- New file `docs/rename-preview-files.md` (this documented plan).
- Implementation of `src/scripts/rename-preview-files.ts`.
- Repo now has `public/fonts/<id>/{png,svg,webp}/regular.*` only (no italic, no `<id>, ` prefix).