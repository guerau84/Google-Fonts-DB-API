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

export interface ParsedMetadata {
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

export function parseMetadata(raw: string): ParsedMetadata {
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