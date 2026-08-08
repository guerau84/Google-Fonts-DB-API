import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../..')
const SRC = join(ROOT, 'src', 'data', 'fonts.json')
const OUT = join(ROOT, 'src', 'data', 'stats.json')

interface Axis {
    tag: string
}

interface FontEntry {
    category: string
    designer: { name: string }
    styles: string[]
    weights: number[]
    subsets: string[]
    variable: boolean
    axes: Axis[]
}

function toCounts(map: Map<string, number>): Record<string, number> {
    const entries = [...map.entries()]
        .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    return Object.fromEntries(entries)
}

async function main(): Promise<void> {
    const raw = await readFile(SRC, 'utf-8')
    const fonts = JSON.parse(raw) as FontEntry[]

    const variableFamilies = fonts.filter((font) => font.variable === true).length
    const designers = new Set<string>()
    const styles = new Map<string, number>()
    const weights = new Map<string, number>()
    const categories = new Map<string, number>()
    const subsets = new Map<string, number>()
    const axes = new Map<string, number>()

    for (const font of fonts) {
        designers.add(font.designer.name)
        for (const style of font.styles) {
            styles.set(style, (styles.get(style) ?? 0) + 1)
        }
        for (const weight of font.weights) {
            const key = String(weight)
            weights.set(key, (weights.get(key) ?? 0) + 1)
        }
        categories.set(font.category, (categories.get(font.category) ?? 0) + 1)
        for (const subset of font.subsets) {
            if (subset === 'menu') continue
            subsets.set(subset, (subsets.get(subset) ?? 0) + 1)
        }
        for (const axis of font.axes) {
            axes.set(axis.tag, (axes.get(axis.tag) ?? 0) + 1)
        }
    }

    const percentage = Math.round((variableFamilies / fonts.length) * 10000) / 100

    const stats = {
        fonts: fonts.length,
        categories: categories.size,
        subsets: subsets.size,
        designers: designers.size,
        variable: {
            families: variableFamilies,
            percentage,
        },
        styles: toCounts(styles),
        weights: toCounts(weights),
        breakdown: {
            categories: toCounts(categories),
            subsets: toCounts(subsets),
        },
        axes: toCounts(axes),
    }

    await writeFile(OUT, `${JSON.stringify(stats, null, 2)}\n`, 'utf-8')

    console.log(`Total fonts: ${stats.fonts}`)
    console.log(`Variable families: ${stats.variable.families} (${stats.variable.percentage}%)`)
    console.log(`Total designers: ${stats.designers}`)
    console.log(`Total subsets (excluding menu): ${Object.keys(stats.breakdown.subsets).length}`)
    console.log(`Total axes: ${Object.keys(stats.axes).length}`)
}

main()
