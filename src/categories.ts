import { Hono } from 'hono'
import categories from './data/categories.json' with { type: 'json' }
import compactCategories from './data/categories.compact.json' with { type: 'json' }

const categoriesApp = new Hono()

const categoriesList = [...new Set(compactCategories.categories)]
const categoriesMap = new Map(
    categories.categories.map(item => [item.id, item])
)

categoriesApp.get('/', (c) => {
    return c.json(categoriesList)
}).get('/:category', (c) => {
    const category = c.req.param('category').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")
    if (!category) {
        return c.notFound()
    }
    const categoryData = categoriesMap.get(category)
    if (!categoryData) {
        return c.notFound()
    }
    return c.json(categoryData)
})

export default categoriesApp