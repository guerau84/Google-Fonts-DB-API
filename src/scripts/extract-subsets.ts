import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../..')
const SRC = join(ROOT, 'src', 'data', 'fonts.json')
const OUT = join(ROOT, 'src', 'data', 'subsets.json')

interface FontEntry {
    id: string
    subsets: string[]
}

interface Subset {
    id: string
    name: string
    count: number
    families: string[]
}

function toName(subset: string): string {
    return subset
        .split('-')
        .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
        .join(' ')
}

async function main(): Promise<void> {
    const raw = await readFile(SRC, 'utf-8')
    const entries = JSON.parse(raw) as FontEntry[]

    const bySubset = new Map<string, string[]>()
    let menuCount = 0
    for (const entry of entries) {
        for (const subset of entry.subsets) {
            if (subset === 'menu') {
                menuCount++
                continue
            }
            const families = bySubset.get(subset) ?? []
            families.push(entry.id)
            bySubset.set(subset, families)
        }
    }

    const subsets: Subset[] = [...bySubset.entries()]
        .map(([id, families]) => ({ id, name: toName(id), count: families.length, families }))
        .sort((a, b) => b.count - a.count || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

    await writeFile(OUT, `${JSON.stringify({ subsets, total: subsets.length }, null, 2)}\n`, 'utf-8')

    console.log(`Total subsets written: ${subsets.length}`)
    console.log(`Menu subsets excluded: ${menuCount}`)
}

main()
