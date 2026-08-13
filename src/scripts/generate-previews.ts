import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import sharp from 'sharp'
import decompress from 'woff2-encoder/decompress'

const require = createRequire(import.meta.url)
const opentype = require('opentype.js') as typeof import('opentype.js')

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../..')
const FONTS_SRC = join(ROOT, 'src', 'data', 'fonts.json')
const PUBLIC = join(ROOT, 'public')

const CONCURRENCY = 6
const WIDTH = 800
const HEIGHT = 150
const BASELINE = 100
const FONT_SIZE = 72
const MARGIN = 20
const MAX_TEXT_WIDTH = WIDTH - MARGIN * 2

interface FontEntry {
    id: string
    family: string
    styles: string[]
    css: { url: string }
    previews: { svg: string; png: string; webp: string }
}

interface OutputPaths {
    svg: string
    png: string
    webp: string
}

function styleLabel(style: string): string {
    return style === 'normal' ? 'regular' : style
}

function parseArgs(argv: string[]): { limit: number | null } {
    let limit: number | null = null
    const index = argv.indexOf('--limit')
    if (index !== -1 && argv[index + 1]) {
        const n = Number(argv[index + 1])
        if (!Number.isNaN(n)) limit = n
    }
    return { limit }
}

const WOFF2_RE = /\/\*\s*latin\s*\*\/[\s\S]*?url\(["']?(.*?)["']?\)/

const BROWSER_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function normalizeCssUrl(cssUrl: string): string {
    const marker = 'family='
    const qPos = cssUrl.indexOf(marker)
    if (qPos === -1) return cssUrl
    const afterFamily = cssUrl.slice(qPos + marker.length)
    const amp = afterFamily.indexOf('&')
    const famVal = amp === -1 ? afterFamily : afterFamily.slice(0, amp)
    const colon = famVal.indexOf(':')
    if (colon === -1 || !famVal.slice(colon + 1).includes(';')) return cssUrl

    const name = famVal.slice(0, colon)
    const groups = famVal.slice(colon + 1).split(';').filter(Boolean)
    const parts: { axis: string; range: string }[] = []
    for (const group of groups) {
        const m = group.match(/^([^@]+)@(.+)$/)
        if (!m) return cssUrl
        parts.push({ axis: m[1], range: m[2] })
    }
    const normalized = `${name}:${parts.map((p) => p.axis).join(',')}@${parts.map((p) => p.range).join(',')}`
    return cssUrl.slice(0, qPos + marker.length) + normalized + (amp === -1 ? '' : afterFamily.slice(amp))
}

async function loadLatinFont(rawCssUrl: string): Promise<opentype.Font> {
    const cssUrl = normalizeCssUrl(rawCssUrl)
    const css = await (await fetch(cssUrl, { headers: { 'User-Agent': BROWSER_UA } })).text()
    const match = css.match(WOFF2_RE)
    if (!match) throw new Error('no latin woff2 in css')
    const woff2 = await (await fetch(match[1])).arrayBuffer()
    const sfnt = await decompress(woff2)
    return opentype.parse(sfnt.buffer.slice(sfnt.byteOffset, sfnt.byteOffset + sfnt.byteLength))
}

async function renderText(font: opentype.Font, text: string, out: OutputPaths): Promise<void> {
    const naturalWidth = font.getAdvanceWidth(text, FONT_SIZE)
    const fontSize = Math.min(FONT_SIZE, (FONT_SIZE * MAX_TEXT_WIDTH) / naturalWidth)
    const width = font.getAdvanceWidth(text, fontSize)
    const path = font.getPath(text, (WIDTH - width) / 2, BASELINE, fontSize)
    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" ` +
        `viewBox="0 0 ${WIDTH} ${HEIGHT}"><path fill="#000" d="${path.toPathData(2)}"/></svg>`

    await Promise.all([
        writeFile(out.svg, svg, 'utf-8'),
        sharp(Buffer.from(svg)).png().toFile(out.png),
        sharp(Buffer.from(svg)).webp().toFile(out.webp),
    ])
}

async function runPool<T>(
    items: T[],
    worker: (item: T) => Promise<void>,
    concurrency: number,
): Promise<void> {
    let cursor = 0
    const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
        while (cursor < items.length) {
            const item = items[cursor++]
            await worker(item)
        }
    })
    await Promise.all(runners)
}

async function processFont(entry: FontEntry): Promise<void> {
    const dirs = [entry.previews.svg, entry.previews.png, entry.previews.webp].map((rel) =>
        join(PUBLIC, rel),
    )
    await Promise.all(dirs.map((dir) => mkdir(dir, { recursive: true })))

    const font = await loadLatinFont(entry.css.url)

    for (const style of entry.styles) {
        const label = styleLabel(style)
        const text = `${entry.family} (${label})`
        const base = `${entry.id}, ${label}`
        await renderText(font, text, {
            svg: join(PUBLIC, entry.previews.svg, `${base}.svg`),
            png: join(PUBLIC, entry.previews.png, `${base}.png`),
            webp: join(PUBLIC, entry.previews.webp, `${base}.webp`),
        })
    }
}

async function main(): Promise<void> {
    const { limit } = parseArgs(process.argv)
    const raw = await readFile(FONTS_SRC, 'utf-8')
    const fonts = JSON.parse(raw) as FontEntry[]
    const selected = limit ? fonts.slice(0, limit) : fonts

    const failed: string[] = []
    let ok = 0

    await runPool(
        selected,
        async (entry) => {
            try {
                await processFont(entry)
                ok++
            } catch (err) {
                failed.push(entry.id)
                const message = err instanceof Error ? err.message : String(err)
                console.warn(`[skip] ${entry.id}: ${message}`)
            }
        },
        CONCURRENCY,
    )

    console.log(`Total: ${selected.length}, ok: ${ok}, skipped: ${selected.length - ok}`)
    if (failed.length) {
        console.log(`Failed ids:\n${failed.join('\n')}`)
    }
}

main()