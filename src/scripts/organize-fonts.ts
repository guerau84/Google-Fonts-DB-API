import { readFile, writeFile, readdir, access } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../..')
const GIT_CLONE = join(ROOT, 'git-clone', 'fonts')
const OUT_FILE = join(ROOT, 'src', 'data', 'fonts.json')

const LICENSE_DIRS = ['apache', 'ofl', 'ufl'] as const

const CATEGORY_MAP: Record<string, string> = {
    SANS_SERIF: 'sans-serif',
    SERIF: 'serif',
    DISPLAY: 'display',
    MONOSPACE: 'monospace',
    HANDWRITING: 'handwriting',
}

interface FontInstance {
    style: string
    weight: number
}

interface Axis {
    tag: string
    min: number
    max: number
}

interface ParsedMetadata {
    name: string
    designer: string
    license: string
    category: string
    dateAdded: string
    fonts: FontInstance[]
    subsets: string[]
    axes: Axis[]
    variable: boolean
    repositoryUrl: string
}

const FIELD_RE = (name: string) => new RegExp(`(?:^|\\n)${name}: "([^"]*)"`)

function parseMetadata(raw: string): ParsedMetadata {
    const name = FIELD_RE('name').exec(raw)?.[1] ?? ''
    const designer = FIELD_RE('designer').exec(raw)?.[1] ?? ''
    let license = FIELD_RE('license').exec(raw)?.[1] ?? ''
    if (license === 'APACHE2') license = 'APACHE'
    const categoryRaw = FIELD_RE('category').exec(raw)?.[1] ?? ''
    const dateAdded = FIELD_RE('date_added').exec(raw)?.[1] ?? ''

    const fonts: FontInstance[] = []
    for (const block of raw.matchAll(/\bfonts\s*\{([\s\S]*?)\}/g)) {
        const body = block[1]
        const style = /(?:^|\n)\s*style: "([^"]*)"/.exec(body)?.[1] ?? 'normal'
        const weight = /(?:^|\n)\s*weight: (\d+)/.exec(body)?.[1]
        if (weight !== undefined) {
            fonts.push({ style, weight: Number(weight) })
        }
    }

    const subsets = [...raw.matchAll(/(?:^|\n)subsets: "([^"]*)"/g)].map((m) => m[1])

    const topLevelAxes: Axis[] = []
    for (const block of raw.matchAll(/(?:^|\n) {0,2}axes\s*\{([\s\S]*?)\n {0,2}\}/g)) {
        const body = block[1]
        const tag = /(?:^|\n)\s*tag: "([^"]*)"/.exec(body)?.[1]
        const min = /(?:^|\n)\s*min_value: (-?\d+(?:\.\d+)?)/.exec(body)?.[1]
        const max = /(?:^|\n)\s*max_value: (-?\d+(?:\.\d+)?)/.exec(body)?.[1]
        if (tag && min !== undefined && max !== undefined) {
            topLevelAxes.push({ tag, min: Number(min), max: Number(max) })
        }
    }

    const repositoryUrl = /repository_url: "([^"]*)"/.exec(raw)?.[1] ?? ''

    return {
        name,
        designer,
        license,
        category: CATEGORY_MAP[categoryRaw] ?? categoryRaw.toLowerCase(),
        dateAdded,
        fonts,
        subsets,
        axes: topLevelAxes,
        variable: topLevelAxes.length > 0,
        repositoryUrl,
    }
}

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
            url: buildCssUrl(pb),
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
    const byId = new Map<string, unknown>()

    try {
        const existing = JSON.parse(await readFile(OUT_FILE, 'utf-8')) as unknown[]
        if (Array.isArray(existing)) {
            for (const entry of existing) {
                const rec = entry as { id: string }
                if (rec && typeof rec.id === 'string') byId.set(rec.id, entry)
            }
        }
    } catch {
        // no file yet or invalid JSON — start fresh
    }

    let processed = 0
    let skippedNoMetadata = 0
    let skippedNoName = 0
    const noRepository: string[] = []

    for (const licenseDir of LICENSE_DIRS) {
        const licensePath = join(GIT_CLONE, licenseDir)
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
            byId.set(entry.id, entry)
            processed++
            if (!pb.repositoryUrl) noRepository.push(`${licenseDir}/${dir.name}`)
        }
    }

    const entries = [...byId.values()].sort((a, b) =>
        (a as { id: string }).id.localeCompare((b as { id: string }).id),
    )

    await writeFile(OUT_FILE, `${JSON.stringify(entries, null, 2)}\n`, 'utf-8')

    console.log(`Processed: ${processed}`)
    console.log(`Skipped (no METADATA.pb): ${skippedNoMetadata}`)
    console.log(`Skipped (no name): ${skippedNoName}`)
    console.log(`No repository_url: ${noRepository.length}`)
    console.log(`Total entries in ${OUT_FILE}: ${entries.length}`)
}

main()
