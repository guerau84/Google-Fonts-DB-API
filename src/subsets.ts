import { Hono } from 'hono'
import subsets from './data/subsets.json' with { type: 'json' }

const subsetsApp = new Hono()

subsetsApp.get('/', (c) => {
    const subsetsList = [...new Set(subsets.subsets.map((subset: any) => {
        return {
            id: subset.id,
            name: subset.name,
            count: subset.count,
        }
    }))]
    return c.json(subsetsList)
}).get('/:subsetId', (c) => {
    const subsetId = c.req.param('subsetId')
    const subset = subsets.subsets.find((subset: any) => subset.id === subsetId)
    if (!subset) {
        return c.notFound()
    }
    return c.json(subset)
})

export default subsetsApp