import fonts from '../data/fonts.json' with { type: 'json' }
import db from '../db/client.js'

export interface Font {
    id: string;
    family: string;
    category: string;
    designer: {
        name: string;
    };
    license: string;
    dateAdded: string;
    subsets: string[];
    styles: string[];
    weights: number[];
    variable: boolean;
    axes: {
        tag: string;
        min: number;
        max: number;
    }[];
    links: {
        googleFonts: string;
        repository: string;
    };
    css: {
        url: string;
    };
    previews: {
        svg: string;
        png: string;
        webp: string;
    };
}

export async function updateDB(updates: Font) {

    const FONT_COLUMNS = `
  font_id, family, category, designer, license, date_added,
  subsets, styles, weights, variable, axes,
  google_fonts_url, repository_url, google_fonts_css_url,
  preview_svg, preview_png, preview_webp
`

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

    if (!existingIds.has(updates.id)) {
        await db.execute({
            sql: `INSERT INTO fonts (${FONT_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                updates.id,
                updates.family,
                updates.category,
                updates.designer.name,
                updates.license,
                updates.dateAdded,
                JSON.stringify(updates.subsets),
                JSON.stringify(updates.styles),
                JSON.stringify(updates.weights),
                updates.variable,
                JSON.stringify(updates.axes),
                updates.links.googleFonts,
                updates.links.repository,
                updates.css.url,
                updates.previews.svg,
                updates.previews.png,
                updates.previews.webp,
            ],
        })
        inserted++
    }


    console.log(`Imported ${inserted} fonts, updated ${updated} fonts`)
    console.log(
        `Subsets: ${subsetsCount}, styles: ${stylesCount}, weights: ${weightsCount}`
    )
}