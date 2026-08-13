import { Hono } from 'hono'
import categories from './data/categories.json' with { type: 'json' }
import compactCategories from './data/categories.compact.json' with { type: 'json' }

const categoriesApp = new Hono()

categoriesApp.get('/', (c) => {
    return c.json(compactCategories)
}).get('/:category', (c) => {
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