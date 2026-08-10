import { Hono } from 'hono'
import fonts from '../data/fonts.json' with { type: 'json' }

const search = new Hono()

search.get('/search/:query', (c) => {
    const { query } = c.req.param()
    const { limit } = c.req.query()
    const { category } = c.req.query()
    const { designer } = c.req.query()
    const { license } = c.req.query()
    const { subset } = c.req.query()
    const { includeDesigner } = c.req.query()
    const { includeCategory } = c.req.query()
    const { includeLicense } = c.req.query()
    const { includeSubset } = c.req.query()
    const limitNumber = limit !== undefined ? Number(limit) : 20

    const fontsList = fonts.filter((font: any) => font.family.toLowerCase().includes(query.toLowerCase()))
    if (category && includeCategory === 'true') {
        fontsList.filter((font: any) => font.category === category)
    }
    if (designer && includeDesigner === 'true') {
        fontsList.filter((font: any) => font.designer === designer)
    }
    if (license && includeLicense === 'true') {
        fontsList.filter((font: any) => font.license === license)
    }
    if (subset && includeSubset === 'true') {
        fontsList.filter((font: any) => font.subsets.includes(subset))
    }

    return c.json({ query: query, total: `${fontsList.length} (limit: ${limitNumber})`, results: fontsList.slice(0, limitNumber) })
})

export default search