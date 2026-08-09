import { Hono } from 'hono'
import categories from './data/categories.json' with { type: 'json' }

const categoriesApp = new Hono()

categoriesApp.get('/categories', (c) => {
    // LIST ALL CATEGORIES
    return c.json(categories)
}).get('/categories/:category', (c) => {
    // GET CATEGORY BY NAME
    const category = c.req.param('category')
    if (!category) {
        return c.notFound()
    }
    return c.json(categories.categories.find((category: any) => category.id === category))
})

export default categoriesApp