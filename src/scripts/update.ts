import fs from 'node:fs'
const { readdir, readFile, writeFile, access } = fs.promises
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseMetadata, type ParsedMetadata } from '../lib/parser.js'
import { generatePreview } from './generate-preview.js'
import { updateDB, type Font } from './update-db.js'
import { FontStats } from '../interfaces/font-stats.interface.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const WORKSPACE = process.env.GITHUB_WORKSPACE ?? process.cwd()

const DATA_DIR = join(__dirname, '..', 'data')
const PREVIEWS_DIR = join('public', 'fonts')
const EXTERNAL_DIR = join(WORKSPACE, '..', 'google-fonts')
const FONTS_JSON = join(DATA_DIR, 'fonts.json')
const STATS_JSON = join(DATA_DIR, 'stats.json')
const CATEGORIES_JSON = join(DATA_DIR, 'categories.json')
const CATEGORIES_COMPACT_JSON = join(DATA_DIR, 'categories.compact.json')
const SUBSETS_JSON = join(DATA_DIR, 'subsets.json')
const SUBSETS_COMPACT_JSON = join(DATA_DIR, 'subsets.compact.json')
const FAMILIES_JSON = join(DATA_DIR, 'families.json')

const LICENSE_DIRS = ['apache', 'ofl', 'ufl'] as const

function toId(name: string): string {
    return name.toLowerCase().replace(/ /g, '-')
}

function plusEncoded(name: string): string {
    return name.replace(/ /g, '+')
}

function buildCssUrl(pb: ParsedMetadata): string {
    const family = plusEncoded(pb.name)
    if (!pb.variable || pb.axes.length === 0) {
        return `https://fonts.googleapis.com/css2?family=${family}&display=swap`
    }
    const axisParam = pb.axes
        .map((axis) => `${axis.tag}@${axis.min}..${axis.max}`)
        .join(';')
    return `https://fonts.googleapis.com/css2?family=${family}:${axisParam}&display=swap`
}

function buildFontEntry(dirName: string, pb: ParsedMetadata) {
    const id = toId(pb.name)
    const styles = [...new Set(pb.fonts.map((f) => f.style))].sort((a, b) => {
        if (a === 'normal') return -1
        if (b === 'normal') return 1
        return a.localeCompare(b)
    })
    const weights = [...new Set(pb.fonts.map((f) => f.weight))].sort((a, b) => a - b)

    const fontCssUrl = buildCssUrl(pb)

    return {
        id,
        family: pb.name,
        category: pb.category,
        designer: {
            name: pb.designer,
        },
        license: pb.license,
        dateAdded: pb.dateAdded,
        subsets: pb.subsets,
        styles,
        weights,
        variable: pb.variable,
        axes: pb.axes.map((axis) => ({ tag: axis.tag, min: axis.min, max: axis.max })),
        links: {
            googleFonts: `https://fonts.google.com/specimen/${plusEncoded(pb.name)}`,
            repository: pb.repositoryUrl,
        },
        css: {
            url: fontCssUrl,
        },
        previews: {
            svg: `fonts/${id}/svg`,
            png: `fonts/${id}/png`,
            webp: `fonts/${id}/webp`,
        },
    }
}

async function exists(path: string): Promise<boolean> {
    try {
        await access(path)
        return true
    } catch {
        return false
    }
}

const CATEGORY_ORDER = ['sans-serif', 'serif', 'display', 'handwriting', 'monospace'] as const

function toDisplayName(id: string): string {
    return id
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}

function countCategories(fonts: Font[]): Record<string, number> {
    const counts: Record<string, number> = {}
    for (const font of fonts) {
        counts[font.category] = (counts[font.category] ?? 0) + 1
    }
    return counts
}

function countSubsets(fonts: Font[]): Record<string, number> {
    const counts: Record<string, number> = {}
    for (const font of fonts) {
        for (const subset of font.subsets) {
            counts[subset] = (counts[subset] ?? 0) + 1
        }
    }
    return counts
}

function countAxes(fonts: Font[]): Record<string, number> {
    const counts: Record<string, number> = {}
    for (const font of fonts) {
        if (!font.variable) continue
        for (const axis of font.axes) {
            counts[axis.tag] = (counts[axis.tag] ?? 0) + 1
        }
    }
    return counts
}

function sortByCountDesc(counts: Record<string, number>): [string, number][] {
    return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

function toRecord(pairs: [string, number][]): Record<string, number> {
    return Object.fromEntries(pairs)
}

function updateStats(fonts: Font[]): FontStats {
    const variableCount = fonts.filter((font) => font.variable).length

    const weights: Record<string, number> = {}
    for (const font of fonts) {
        for (const weight of font.weights) {
            weights[String(weight)] = (weights[String(weight)] ?? 0) + 1
        }
    }
    const orderedWeights: Record<string, number> = {}
    for (const weight of Object.keys(weights).sort((a, b) => Number(a) - Number(b))) {
        orderedWeights[weight] = weights[weight]
    }

    const designers = new Set(fonts.map((font) => font.designer.name))

    return {
        fonts: fonts.length,
        categories: new Set(fonts.map((font) => font.category)).size,
        subsets: new Set(fonts.flatMap((font) => font.subsets)).size,
        designers: designers.size,
        variable: {
            families: variableCount,
            percentage: fonts.length
                ? Math.round((variableCount / fonts.length) * 10000) / 100
                : 0,
        },
        styles: {
            normal: fonts.filter((font) => font.styles.includes('normal')).length,
            italic: fonts.filter((font) => font.styles.includes('italic')).length,
        },
        weights: orderedWeights,
        breakdown: {
            categories: toRecord(sortByCountDesc(countCategories(fonts))),
            subsets: toRecord(sortByCountDesc(countSubsets(fonts))),
        },
        axes: toRecord(sortByCountDesc(countAxes(fonts))),
    }
}

function buildFamilies(fonts: Font[]) {
    const families = fonts
        .map((font) => ({
            id: font.id,
            family: font.family,
            category: font.category,
            designer: font.designer.name,
            variable: font.variable,
            styles: font.styles,
            weights: font.weights,
            subsets: font.subsets,
            axes: font.axes.map((axis) => axis.tag),
        }))
        .sort((a, b) => a.id.localeCompare(b.id))

    return { families, total: families.length }
}

function buildCategories(fonts: Font[]) {
    const counts = countCategories(fonts)
    const ids = [
        ...CATEGORY_ORDER.filter((id) => counts[id] !== undefined),
        ...Object.keys(counts)
            .filter((id) => !CATEGORY_ORDER.includes(id as (typeof CATEGORY_ORDER)[number]))
            .sort(),
    ]

    const full = ids.map((id) => ({
        id,
        name: toDisplayName(id),
        count: counts[id],
        families: fonts
            .filter((font) => font.category === id)
            .map((font) => font.id)
            .sort(),
    }))
    const compact = full.map(({ families: _families, ...rest }) => rest)

    return {
        full: { categories: full, total: full.length },
        compact: { categories: compact, total: full.length },
    }
}

function buildSubsets(fonts: Font[]) {
    const counts = countSubsets(fonts)
    const ids = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b))

    const full = ids.map((id) => ({
        id,
        name: toDisplayName(id),
        count: counts[id],
        families: fonts
            .filter((font) => font.subsets.includes(id))
            .map((font) => font.id)
            .sort(),
    }))
    const compact = full.map(({ families: _families, ...rest }) => rest)

    return {
        full: { subsets: full, total: full.length },
        compact: { subsets: compact, total: full.length },
    }
}

async function main(): Promise<void> {
    let existing: Font[] = []

    try {
        const parsed = JSON.parse(await readFile(FONTS_JSON, 'utf-8'))
        if (Array.isArray(parsed)) existing = parsed as Font[]
    } catch {
        // no file yet or invalid JSON — start fresh
    }

    const existingIds = new Set(existing.map((rec) => rec.id))
    const newEntries: Font[] = []

    let processed = 0
    let skippedNoMetadata = 0
    let skippedNoName = 0
    const noRepository: string[] = []

    for (const licenseDir of LICENSE_DIRS) {
        const licensePath = join(EXTERNAL_DIR, licenseDir)
        if (!(await exists(licensePath))) continue

        const dirs = await readdir(licensePath, { withFileTypes: true })
        for (const dir of dirs) {
            if (!dir.isDirectory()) continue

            const pbPath = join(licensePath, dir.name, 'METADATA.pb')
            if (!(await exists(pbPath))) {
                skippedNoMetadata++
                continue
            }

            const raw = await readFile(pbPath, 'utf-8')
            const pb = parseMetadata(raw)
            if (!pb.name) {
                skippedNoName++
                continue
            }

            const entry = buildFontEntry(dir.name, pb)
            if (existingIds.has(entry.id)) continue
            existingIds.add(entry.id)
            await generatePreview(buildCssUrl(pb), pb.name, PREVIEWS_DIR)
            await updateDB(entry)
            newEntries.push(entry)
            if (!pb.repositoryUrl) noRepository.push(`${licenseDir}/${dir.name}`)
        }
    }

    const fonts = [...existing, ...newEntries].sort((a, b) => a.id.localeCompare(b.id))

    const categories = buildCategories(fonts)
    const subsets = buildSubsets(fonts)

    await writeFile(FONTS_JSON, JSON.stringify(fonts, null, 2), 'utf-8')
    await writeFile(STATS_JSON, JSON.stringify(updateStats(fonts), null, 2), 'utf-8')
    await writeFile(FAMILIES_JSON, JSON.stringify(buildFamilies(fonts), null, 2), 'utf-8')
    await writeFile(CATEGORIES_JSON, JSON.stringify(categories.full, null, 2), 'utf-8')
    await writeFile(CATEGORIES_COMPACT_JSON, JSON.stringify(categories.compact, null, 2), 'utf-8')
    await writeFile(SUBSETS_JSON, JSON.stringify(subsets.full, null, 2), 'utf-8')
    await writeFile(SUBSETS_COMPACT_JSON, JSON.stringify(subsets.compact, null, 2), 'utf-8')
}

main()