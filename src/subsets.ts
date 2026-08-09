import { Hono } from 'hono'
import subsets from './data/subsets.json' with { type: 'json' }

const subsetsApp = new Hono()

subsetsApp.get('/subsets', (c) => {
    return c.json(subsets)
}).get('/subsets/:subsetId', (c) => {
    const subsetId = c.req.param('subsetId')
    const subset = subsets.subsets.find((subset: any) => subset.id === subsetId)
    if (!subset) {
        return c.notFound()
    }
    return c.json(subset)
})

export default subsetsApp