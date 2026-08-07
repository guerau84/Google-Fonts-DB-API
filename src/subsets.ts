import { Hono } from 'hono'

const subsets = new Hono()

subsets.get('/subsets', (c) => {
    // LIST ALL SUBSETS
    return c.text('OK')
}).get('/subsets/:subset', (c) => {
    // GET SUBSET BY NAME
    return c.text('OK')
})

export default subsets