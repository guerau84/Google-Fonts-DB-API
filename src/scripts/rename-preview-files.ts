import { readdir, rename, rm } from 'node:fs/promises'
import { join } from 'node:path'

const FONTS_ROOT = 'public/fonts'
const FORMATS = ['png', 'svg', 'webp']
const FILE_RE = /^(.+),\s*(regular|italic)\.(png|svg|webp)$/

async function main(): Promise<void> {
    const fontDirs = (await readdir(FONTS_ROOT, { withFileTypes: true }))
        .filter((d) => d.isDirectory())
        .map((d) => d.name)

    let renamed = 0
    let deleted = 0
    let warned = 0

    for (const font of fontDirs) {
        for (const fmt of FORMATS) {
            const dir = join(FONTS_ROOT, font, fmt)
            let files: string[]
            try {
                files = await readdir(dir)
            } catch {
                continue // folder missing
            }
            for (const f of files) {
                const m = f.match(FILE_RE)
                if (!m) {
                    warned++
                    console.warn(`[skip] ${join(dir, f)}`)
                    continue
                }
                const style = m[2]
                const ext = m[3]
                if (style === 'italic') {
                    await rm(join(dir, f))
                    deleted++
                } else {
                    await rename(join(dir, f), join(dir, `${style}.${ext}`))
                    renamed++
                }
            }
        }
    }

    console.log(`renamed=${renamed} deleted=${deleted} warned=${warned}`)
}

main()