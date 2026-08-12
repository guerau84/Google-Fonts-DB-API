import { createClient } from '@libsql/client'
import fonts from '../data/fonts.json' with { type: 'json' }

const db = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
})

const FONT_COLUMNS = `
  font_id, family, category, designer, license, date_added,
  subsets, styles, weights, variable, axes,
  google_fonts_url, repository_url, google_fonts_css_url,
  preview_svg, preview_png, preview_webp
`

function fontArgs(font: (typeof fonts)[number]) {
    return [
        font.id,
        font.family,
        font.category,
        font.designer.name,
        font.license,
        font.dateAdded,
        JSON.stringify(font.subsets),
        JSON.stringify(font.styles),
        JSON.stringify(font.weights),
        font.variable ? 1 : 0,
        JSON.stringify(font.axes),
        font.links.googleFonts,
        font.links.repository,
        font.css.url,
        font.previews.svg,
        font.previews.png,
        font.previews.webp,
    ]
}

const BATCH_SIZE = 250

const existingRows = await db.execute({
    sql: 'SELECT font_id FROM fonts',
    args: [],
})
const existingIds = new Set(existingRows.rows.map((r) => r.font_id as string))

let inserted = 0
let updated = 0
let subsetsCount = 0
let stylesCount = 0
let weightsCount = 0

for (let i = 0; i < fonts.length; i += BATCH_SIZE) {
    const chunk = fonts.slice(i, i + BATCH_SIZE)
    const statements: { sql: string; args: (string | number)[] }[] = []

    for (const font of chunk) {
        const exists = existingIds.has(font.id)

        if (exists) {
            statements.push({
                sql: `INSERT OR REPLACE INTO fonts (${FONT_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                args: fontArgs(font),
            })
            statements.push({
                sql: 'DELETE FROM font_subsets WHERE font_id = ?',
                args: [font.id],
            })
            statements.push({
                sql: 'DELETE FROM font_styles WHERE font_id = ?',
                args: [font.id],
            })
            statements.push({
                sql: 'DELETE FROM font_weights WHERE font_id = ?',
                args: [font.id],
            })
        } else {
            statements.push({
                sql: `INSERT INTO fonts (${FONT_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                args: fontArgs(font),
            })
        }

        for (const subset of font.subsets) {
            statements.push({
                sql: 'INSERT INTO font_subsets (font_id, subset) VALUES (?, ?)',
                args: [font.id, subset],
            })
            subsetsCount++
        }
        for (const style of font.styles) {
            statements.push({
                sql: 'INSERT INTO font_styles (font_id, style) VALUES (?, ?)',
                args: [font.id, style],
            })
            stylesCount++
        }
        for (const weight of font.weights) {
            statements.push({
                sql: 'INSERT INTO font_weights (font_id, weight) VALUES (?, ?)',
                args: [font.id, weight],
            })
            weightsCount++
        }

        if (exists) {
            updated++
        } else {
            inserted++
        }
    }

    await db.batch(statements)
}

console.log(`Imported ${inserted} fonts, updated ${updated} fonts`)
console.log(
    `Subsets: ${subsetsCount}, styles: ${stylesCount}, weights: ${weightsCount}`
)