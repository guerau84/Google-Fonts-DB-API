import { Hono } from 'hono'
import fonts from './data/fonts.json' with { type: 'json' }
import { readOnlyDb } from './db/client.js'

const licensesApp = new Hono()

licensesApp.get('/', async (c) => {
    const result = await readOnlyDb.execute(`
    SELECT DISTINCT license
    FROM fonts
    WHERE license IS NOT NULL
      AND license != ''
    ORDER BY license
  `)

    return c.json(result.rows.map(row => row.license))

}).get('/:licenseId', async (c) => {
    const licenseId = c.req.param('licenseId').toUpperCase()
    const { rows } = await readOnlyDb.execute({
        sql: 'SELECT * FROM fonts WHERE license = ?',
        args: [licenseId]
    })

    if (rows.length === 0) {
        return c.notFound()
    }

    return c.json(rows)
})

export default licensesApp