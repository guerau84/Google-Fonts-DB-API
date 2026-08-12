import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../..')
const SRC = join(ROOT, 'src', 'data', 'categories.json')
const OUT = join(ROOT, 'src', 'data', 'categories.compact.json')

interface Category {
    id: string
    name: string
    count: number
    families?: string[]
}

interface CompactCategory {
    id: string
    name: string
    count: number
}

async function main(): Promise<void> {
    const raw = await readFile(SRC, 'utf-8')
    const source = JSON.parse(raw) as { categories: Category[] }

    const categories: CompactCategory[] = source.categories.map(({ id, name, count }) => ({ id, name, count }))
    const totalFonts = categories.reduce((sum, category) => sum + category.count, 0)

    await writeFile(OUT, `${JSON.stringify({ categories, total: categories.length }, null, 2)}\n`, 'utf-8')

    console.log(`Total categories: ${categories.length}`)
    console.log(`Total fonts: ${totalFonts}`)
}

main()