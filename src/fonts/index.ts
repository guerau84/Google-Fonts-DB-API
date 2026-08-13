import { Hono } from 'hono'
import search from './search.js'
import svg from './svg.js'
import png from './png.js'
import webp from './webp.js'
import { readOnlyDb } from '../db/client.js'

const fontsApp = new Hono()

fontsApp.route('/', search)
fontsApp.route('/', svg)
fontsApp.route('/', png)
fontsApp.route('/', webp)

fontsApp.get('/', async (c) => {
    const { limit, page = '1' } = c.req.query()
    const pageNumber = Math.max(Number(page) || 1, 1)
    const limitNumber = Math.min(
        Math.max(Number(limit) || 20, 1),
        100
    )
    const offset = (pageNumber - 1) * limitNumber;
    const { rows } = await readOnlyDb.execute(`SELECT * FROM fonts LIMIT ? OFFSET ?`, [limitNumber, offset])
    const formatedRows = rows.map(row => ({
        ...row,
        subsets: typeof row.subsets === 'string' ? JSON.parse(row.subsets) : row.subsets,
        styles: typeof row.styles === 'string' ? JSON.parse(row.styles) : row.styles,
        weights: typeof row.weights === 'string' ? JSON.parse(row.weights) : row.weights,
        axes: typeof row.axes === 'string' ? JSON.parse(row.axes) : row.axes,
    }))
    return c.json({ page: pageNumber, limit: limitNumber, total: rows.length, results: formatedRows })
}).get('/:font', async (c) => {
    const font = c.req.param('font').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")
    if (!font) {
        return c.notFound()
    }
    const { rows } = await readOnlyDb.execute(`SELECT * FROM fonts WHERE font_id = ?`, [font])
    if (!rows.length) {
        return c.notFound()
    }
    const formatedRows = rows.map(row => ({
        ...row,
        subsets: typeof row.subsets === 'string' ? JSON.parse(row.subsets) : row.subsets,
        styles: typeof row.styles === 'string' ? JSON.parse(row.styles) : row.styles,
        weights: typeof row.weights === 'string' ? JSON.parse(row.weights) : row.weights,
        axes: typeof row.axes === 'string' ? JSON.parse(row.axes) : row.axes,
    }))
    return c.json(formatedRows[0])
})

export default fontsApp