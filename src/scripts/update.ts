import { readdir, readFile, writeFile, access } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseMetadata, type ParsedMetadata } from '../lib/parser.js'
import { generatePreview } from './generate-preview.js'
import { updateDB } from './update-db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DATA_DIR = join(__dirname, '..', 'data')
const PREVIEWS_DIR = join('public', 'fonts')
const EXTERNAL_DIR = join(__dirname, 'external', 'fonts')
const FONTS_JSON = join(DATA_DIR, 'fonts.json')
const STATS_JSON = join(DATA_DIR, 'stats.json')
const CATEGORIES_JSON = join(DATA_DIR, 'categories.json')
const SUBSETS_JSON = join(DATA_DIR, 'subsets.json')
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

async function main(): Promise<void> {
    let existing: { id: string }[] = []

    try {
        const parsed = JSON.parse(await readFile(FONTS_JSON, 'utf-8'))
        if (Array.isArray(parsed)) existing = parsed
    } catch {
        // no file yet or invalid JSON — start fresh
    }

    const existingIds = new Set(existing.map((rec) => rec.id))
    const newEntries: unknown[] = []

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

            const entry = buildFontEntry(dir.name, pb) as { id: string }
            if (existingIds.has(entry.id)) continue
            existingIds.add(entry.id)
            await generatePreview(buildCssUrl(pb), pb.name, PREVIEWS_DIR)
            updateDB(entry)
            newEntries.push(entry)
            if (!pb.repositoryUrl) noRepository.push(`${licenseDir}/${dir.name}`)
        }
    }

    const fonts = [...existing, ...newEntries].sort((a, b) =>
        (a as { id: string }).id.localeCompare((b as { id: string }).id),
    )

    await writeFile(FONTS_JSON, JSON.stringify(fonts, null, 2), 'utf-8')
}

main()