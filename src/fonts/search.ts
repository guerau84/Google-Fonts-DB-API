import { Hono } from 'hono'
import { readFileSync } from 'fs'

const search = new Hono()

search.get('/search/:query', (c) => {
    const { query } = c.req.param()
    return c.text(query)
})

export default search