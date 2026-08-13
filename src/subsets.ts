import { Hono } from 'hono'
import subsets from './data/subsets.json' with { type: 'json' }
import compactSubsets from './data/subsets.compact.json' with { type: 'json' }

const subsetsApp = new Hono()

subsetsApp.get('/', (c) => {
    const subsetsList = [...new Set(compactSubsets.subsets.map((subset: any) => subset))]
    return c.json(subsetsList)
}).get('/:subsetId', (c) => {
    const subsetId = c.req.param('subsetId').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")
    const subset = subsets.subsets.find((subset: any) => subset.id === subsetId)
    if (!subset) {
        return c.notFound()
    }
    return c.json(subset)
})

export default subsetsApp