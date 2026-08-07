import { Hono } from 'hono'

const categories = new Hono()

categories.get('/categories', (c) => {
    // LIST ALL CATEGORIES
    return c.text('OK')
}).get('/categories/:category', (c) => {
    // GET CATEGORY BY NAME
    return c.text('OK')
})

export default categories