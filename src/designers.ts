import { Hono } from 'hono'
import fonts from './data/fonts.json' with { type: 'json' }
import { readOnlyDb } from './db/client.js'

const designersApp = new Hono()

designersApp.get('/', async (c) => {
    const { rows } = await readOnlyDb.execute(`
    SELECT DISTINCT designer
    FROM fonts
    WHERE designer IS NOT NULL
      AND designer != ''
    ORDER BY designer
  `)

    return c.json(rows.map(row => row.designer))

}).get('/:designer', async (c) => {
    const designerParam = c.req.param('designer').toLowerCase()

    // En la base de datos el nombre del diseñador contiene espacios (ej. "Vernon Adams"),
    // pero el parámetro de la URL se envía en formato slug (ej. "vernon-adams").
    const { rows } = await readOnlyDb.execute({
        sql: `
            SELECT * FROM fonts 
            WHERE REPLACE(LOWER(designer), ' ', '-') = ? 
               OR LOWER(designer) = ?
        `,
        args: [designerParam, designerParam]
    })

    if (rows.length === 0) {
        return c.notFound()
    }

    // Parsear los campos guardados como cadenas JSON en SQLite
    const formattedRows = rows.map(row => ({
        ...row,
        subsets: typeof row.subsets === 'string' ? JSON.parse(row.subsets) : row.subsets,
        styles: typeof row.styles === 'string' ? JSON.parse(row.styles) : row.styles,
        weights: typeof row.weights === 'string' ? JSON.parse(row.weights) : row.weights,
        axes: typeof row.axes === 'string' ? JSON.parse(row.axes) : row.axes,
    }))

    return c.json(formattedRows)
})

export default designersApp