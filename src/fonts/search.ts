import { Hono } from 'hono'
import { readOnlyDb } from '../db/client.js'

const searchApp = new Hono()

searchApp.get('/search/:query', async (c) => {
    const { query } = c.req.param()
    const { limit, category, designer, license, subset, page = '1' } = c.req.query()

    const pageNumber = Math.max(Number(page) || 1, 1)
    const limitNumber = Math.min(
        Math.max(Number(limit) || 20, 1),
        100
    )
    const offset = (pageNumber - 1) * limitNumber;

    const conditions: string[] = []
    const args: (string | number)[] = []

    if (query) {
        conditions.push('family LIKE ?')
        args.push(`%${query}%`)
    }

    if (category) {
        conditions.push('category LIKE ?')
        args.push(`%${category}%`)
    }

    if (designer) {
        conditions.push('designer LIKE ?')
        args.push(`%${designer}%`)
    }

    if (license) {
        conditions.push('license = ?')
        args.push(license)
    }

    if (subset) {
        conditions.push('subsets LIKE ?')
        args.push(`%"${subset}"%`)
    }

    const where =
        conditions.length > 0
            ? `WHERE ${conditions.join(' AND ')}`
            : ''

    const countResult = await readOnlyDb.execute({
        sql: `
      SELECT COUNT(*) as total
      FROM fonts
      ${where}
    `,
        args,
    })

    const total = Number(countResult.rows[0].total)

    const result = await readOnlyDb.execute({
        sql: `
      SELECT
        id,
        family,
        category,
        designer,
        license,
        subsets
      FROM fonts
      ${where}
      ORDER BY family
      LIMIT ? OFFSET ?
    `,
        args: [
            ...args,
            limitNumber,
            offset,
        ],
    })

    const formatedResult = result.rows.map((font) => {
        return {
            id: font.id,
            family: font.family,
            category: font.category,
            designer: font.designer,
            license: font.license,
            subsets: typeof font.subsets === 'string' ? JSON.parse(font.subsets) : font.subsets,
        }
    })

    return c.json({
        query: query,
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber),
        results: formatedResult,
    })
})

export default searchApp