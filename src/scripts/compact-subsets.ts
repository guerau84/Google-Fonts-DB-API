import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../..')
const SRC = join(ROOT, 'src', 'data', 'subsets.json')
const OUT = join(ROOT, 'src', 'data', 'subsets.compact.json')

interface Subset {
    id: string
    name: string
    count: number
    families?: string[]
}

interface CompactSubset {
    id: string
    name: string
    count: number
}

async function main(): Promise<void> {
    const raw = await readFile(SRC, 'utf-8')
    const source = JSON.parse(raw) as { subsets: Subset[] }

    const subsets: CompactSubset[] = source.subsets.map(({ id, name, count }) => ({ id, name, count }))
    const totalFonts = subsets.reduce((sum, subset) => sum + subset.count, 0)

    await writeFile(OUT, `${JSON.stringify({ subsets, total: subsets.length }, null, 2)}\n`, 'utf-8')

    console.log(`Total subsets: ${subsets.length}`)
    console.log(`Total fonts: ${totalFonts}`)
}

main()