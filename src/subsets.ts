import { Hono } from 'hono'
import subsets from './data/subsets.json' with { type: 'json' }
import compactSubsets from './data/subsets.compact.json' with { type: 'json' }

const subsetsApp = new Hono()

const subsetsList = [...new Set(compactSubsets.subsets)]
const subsetsMap = new Map(
    subsets.subsets.map(subset => [subset.id, subset])
)

subsetsApp.get('/', (c) => {
    return c.json(subsetsList)
}).get('/:subsetId', (c) => {
    const subsetId = c.req.param('subsetId').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")
    const subset = subsetsMap.get(subsetId)
    if (!subset) {
        return c.notFound()
    }
    return c.json(subset)
})

export default subsetsApp