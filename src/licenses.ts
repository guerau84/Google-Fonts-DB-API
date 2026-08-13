import { Hono } from 'hono'
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
  const page = Math.max(1, Number(c.req.query('page')) || 1)
  const limit = Math.min(100, Number(c.req.query('limit')) || 20)
  const offset = (page - 1) * limit

  const { rows } = await readOnlyDb.execute({
    sql: 'SELECT * FROM fonts WHERE license = ? ORDER BY family ASC LIMIT ? OFFSET ?',
    args: [licenseId, limit, offset]
  })

  if (rows.length === 0) {
    return c.notFound()
  }

  const formattedRows = rows.map(row => ({
    ...row,
    subsets: typeof row.subsets === 'string' ? JSON.parse(row.subsets) : row.subsets,
    styles: typeof row.styles === 'string' ? JSON.parse(row.styles) : row.styles,
    weights: typeof row.weights === 'string' ? JSON.parse(row.weights) : row.weights,
    axes: typeof row.axes === 'string' ? JSON.parse(row.axes) : row.axes,
  }))

  return c.json({ license: licenseId, count: rows.length, limit, page, fonts: { ...formattedRows } })
})

export default licensesApp