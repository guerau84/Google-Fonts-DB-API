import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../..')
const SRC = join(ROOT, 'src', 'data', 'fonts.json')
const OUT = join(ROOT, 'src', 'data', 'categories.json')

const CATEGORY_ORDER = ['sans-serif', 'serif', 'display', 'handwriting', 'monospace'] as const

interface FontEntry {
    id: string
    category: string
}

interface Category {
    id: string
    name: string
    count: number
    families: string[]
}

function toName(category: string): string {
    return category
        .split('-')
        .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
        .join(' ')
}

async function main(): Promise<void> {
    const raw = await readFile(SRC, 'utf-8')
    const entries = JSON.parse(raw) as FontEntry[]

    const byCategory = new Map<string, string[]>()
    for (const entry of entries) {
        const families = byCategory.get(entry.category) ?? []
        families.push(entry.id)
        byCategory.set(entry.category, families)
    }

    const categories: Category[] = CATEGORY_ORDER.map((id) => {
        const families = byCategory.get(id) ?? []
        return { id, name: toName(id), count: families.length, families }
    })

    await writeFile(OUT, `${JSON.stringify({ categories, total: categories.length }, null, 2)}\n`, 'utf-8')

    console.log(`Total categories: ${categories.length}`)
    console.log(`Total fonts processed: ${entries.length}`)
}

main()
