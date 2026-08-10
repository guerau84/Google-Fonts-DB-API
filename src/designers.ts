import { Hono } from 'hono'
import fonts from './data/fonts.json' with { type: 'json' }

const designersApp = new Hono()

designersApp.get('/', (c) => {
    const designers = fonts.map((font: any) => font.designer)
    return c.json(designers)
}).get('/:designer', (c) => {
    const designer = c.req.param('designer')
    const designerFonts = fonts.find((font: any) => font.designer === designer)
    if (!designerFonts) {
        return c.notFound()
    }
    return c.json(designerFonts)
})

export default designersApp