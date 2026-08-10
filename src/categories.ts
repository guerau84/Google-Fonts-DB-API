import { Hono } from 'hono'
import categories from './data/categories.json' with { type: 'json' }

const categoriesApp = new Hono()

categoriesApp.get('/', (c) => {
    // LIST ALL CATEGORIES
    return c.json(categories)
}).get('/:category', (c) => {
    // GET CATEGORY BY NAME
    const category = c.req.param('category')
    if (!category) {
        return c.notFound()
    }
    const categoryData = categories.categories.find((item: any) => item.id === category)
    if (!categoryData) {
        return c.notFound()
    }
    return c.json(categoryData)
})

export default categoriesApp