import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../..')
const SRC = join(ROOT, 'src', 'data', 'fonts.json')
const OUT = join(ROOT, 'src', 'data', 'families.json')

interface FontEntry {
    id: string
    family: string
    category: string
    designer: { name: string }
    variable: boolean
    styles: string[]
    weights: number[]
    subsets: string[]
    axes: { tag: string; min: number; max: number }[]
}

interface Family {
    id: string
    family: string
    category: string
    designer: string
    variable: boolean
    styles: string[]
    weights: number[]
    subsets: string[]
    axes: string[]
}

function toFamily(entry: FontEntry): Family {
    return {
        id: entry.id,
        family: entry.family,
        category: entry.category,
        designer: entry.designer.name,
        variable: entry.variable,
        styles: entry.styles,
        weights: entry.weights,
        subsets: entry.subsets,
        axes: entry.axes.map((axis) => axis.tag),
    }
}

async function main(): Promise<void> {
    const raw = await readFile(SRC, 'utf-8')
    const entries = JSON.parse(raw) as FontEntry[]

    const families = entries.map(toFamily)

    await writeFile(OUT, `${JSON.stringify({ families, total: families.length }, null, 2)}\n`, 'utf-8')

    console.log(`Total families: ${families.length}`)
}

main()
