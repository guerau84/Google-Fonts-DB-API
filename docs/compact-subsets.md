# Plan: Compact `subsets.json` — Drop the `families` Field

## Context

- Source: `src/data/subsets.json` (181 subset objects, each `{ id, name, count, families }`), mirroring how `docs/compact-categories.md` handles `categories.json`.
- Target: `src/data/subsets.compact.json` (new file). Generate a lightweight index that **removes the `families` array**, keeping only `id`, `name`, `count`.
- Do not touch `src/data/subsets.json`, `src/data/fonts.json`, `src/scripts/*`, `package.json`, etc.
- Goal: a slimmer payload for consumers that only need subset metadata and counts, without the full per-family listings.
- Only this plan MD is delivered in this task; the implementation is left for the next one.

## Data notes (verified against `subsets.json`)

- The source has **181** subsets, in canonical order:
  `latin`, `latin-ext`, `vietnamese`, `cyrillic`, `cyrillic-ext`, `greek`, `math`, `greek-ext`, `symbols`, `japanese`, `devanagari`, `hebrew`, `arabic`, `korean`, `thai`, `khmer`, `telugu`, `symbols2`, `tamil`, `chinese-traditional`, `gujarati`, `bengali`, `gurmukhi`, `kannada`, `chinese-simplified`, `malayalam`, `sinhala`, `emoji`, `braille`, `ethiopic`, `lao`, `oriya`, `syriac`, `armenian`, `myanmar`, `adlam`, `canadian-aboriginal`, `cherokee`, `lisu`, `chinese-hongkong`, `kayah-li`, `nko`, `runic`, `tibetan`, `tifinagh`, `balinese`, `georgian`, `glagolitic`, `gothic`, `grantha`, `gunjala-gondi`, `khojki`, `lepcha`, `limbu`, `mayan-numerals`, `new-tai-lue`, `nushu`, `nyiakeng-puachue-hmong`, `old-italic`, `old-permic`, `phoenician`, `tai-viet`, `vithkuqi`, `yi`, `ahom`, `anatolian-hieroglyphs`, `avestan`, `bamum`, `bassa-vah`, `batak`, `beria-erfe`, `bhaiksuki`, `brahmi`, `buginese`, `buhid`, `carian`, `caucasian-albanian`, `chakma`, `cham`, `chorasmian`, `coptic`, `cuneiform`, `cypriot`, `cypro-minoan`, `deseret`, `dives-akuru`, `dogra`, `duployan`, `egyptian-hieroglyphs`, `elbasan`, `elymaic`, `hanifi-rohingya`, `hanunoo`, `hatran`, `imperial-aramaic`, `indic-siyaq-numbers`, `inscriptional-pahlavi`, `inscriptional-parthian`, `javanese`, `kaithi`, `kana-extended`, `kawi`, `kharoshthi`, `khitan-small-script`, `khudawadi`, `kirat-rai`, `linear-a`, `linear-b`, `lycian`, `lydian`, `mahajani`, `makasar`, `mandaic`, `manichaean`, `marchen`, `masaram-gondi`, `medefaidrin`, `meetei-mayek`, `mende-kikakui`, `meroitic`, `meroitic-cursive`, `meroitic-hieroglyphs`, `miao`, `modi`, `mongolian`, `mro`, `multani`, `music`, `nabataean`, `nag-mundari`, `nandinagari`, `newa`, `ogham`, `ol-chiki`, `old-hungarian`, `old-north-arabian`, `old-persian`, `old-sogdian`, `old-south-arabian`, `old-turkic`, `old-uyghur`, `osage`, `osmanya`, `ottoman-siyaq-numbers`, `pahawh-hmong`, `palmyrene`, `pau-cin-hau`, `phags-pa`, `psalter-pahlavi`, `rejang`, `samaritan`, `saurashtra`, `sharada`, `shavian`, `siddham`, `signwriting`, `sogdian`, `sora-sompeng`, `soyombo`, `sundanese`, `sunuwar`, `syloti-nagri`, `tagalog`, `tagbanwa`, `tai-le`, `tai-tham`, `takri`, `tamil-supplement`, `tangsa`, `tangut`, `thaana`, `tirhuta`, `todhri`, `toto`, `ugaritic`, `vai`, `wancho`, `warang-citi`, `yezidi`, `zanabazar-square`, `znamenny`.
- Current `count` values (sum = **5624** total font/set assignments).
- `count` is already present and correct, so the compact step only needs to drop `families` (it never recomputes counts).

## Output format

```json
{
  "subsets": [
    { "id": "latin", "name": "Latin", "count": 1875 },
    { "id": "latin-ext", "name": "Latin Ext", "count": 1548 },
    { "id": "vietnamese", "name": "Vietnamese", "count": 537 }
  ],
  "total": 181
}
```

### Rules

| Point | Decision |
|---|---|
| `id` | copied as-is from `subsets.json` |
| `name` | copied as-is from `subsets.json` |
| `count` | copied as-is from `subsets.json` (do not recompute) |
| `families` | removed entirely (do not emit `families: []` or an empty array) |
| Order | preserved exactly as in `subsets.json` (starts `latin`, `latin-ext`, `vietnamese`, `cyrillic`, `cyrillic-ext`, …) |
| `total` | `subsets.length` (181) |

## Proposed implementation in `src/scripts/compact-subsets.ts`

1. **Paths** (relative to the project root):
   - `SRC = src/data/subsets.json`
   - `OUT = src/data/subsets.compact.json`
2. **Read**: `readFile` + `JSON.parse` of `subsets.json`. If missing or corrupt, abort with an error.
3. **Map**: `subsets.map(({ id, name, count }) => ({ id, name, count }))` — destructuring drops `families`.
4. **Write**: `JSON.stringify({ subsets, total: subsets.length }, null, 2)` + trailing newline.
5. **Logging**: total subsets and total fonts (sum of counts).
6. **Entrypoint**: `main()` with `await`, ESM; run with `npx tsx src/scripts/compact-subsets.ts`. No changes to `package.json`.

## Verification

- `npx tsc --noEmit` (there is no build script).
- Run `npx tsx src/scripts/compact-subsets.ts` and check:
  - `src/data/subsets.compact.json` is valid JSON with `total` == `subsets.length` == **181**.
  - Every subset object has exactly the keys `id`, `name`, `count` (no `families`).
  - `count` values and `name`/`id` match `subsets.json` exactly.
  - Order matches `subsets.json`.
  - Sum of `count` == **5624**.
  - Output is smaller than `subsets.json` (dropped `families` removed most of the bytes).
  - Run twice → same result (deterministic).

## Deliverable

- New file `docs/compact-subsets.md` (this plan).
- (Next task) `src/scripts/compact-subsets.ts` + populated `src/data/subsets.compact.json`.