import { Hono } from 'hono'
import fonts from './data/fonts.json' with { type: 'json' }

const designersApp = new Hono()

designersApp.get('/', (c) => {
    const designerNames = [...new Set(
        fonts
            .map((font: any) => typeof font.designer === 'object' ? font.designer?.name : font.designer)
            .filter(Boolean)
    )] as string[]

    const designers = designerNames.map((designerName: string) => ({
        id: designerName
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, "-"),
        name: designerName,
        fonts: fonts
            .filter((font: any) => {
                const name = typeof font.designer === 'object' ? font.designer?.name : font.designer
                return name === designerName
            })
            .map((font: any) => ({
                id: font.id,
                name: font.family,
            })),
    }))

    return c.json(designers)
}).get('/:designer', (c) => {
    const designer = c.req.param('designer')
    const designerFonts = fonts.filter((font: any) => {
        const name = typeof font.designer === 'object' ? font.designer?.name : font.designer
        if (!name) return false
        const id = name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, "-")
        return id === designer || name === designer
    })
    if (designerFonts.length === 0) {
        return c.notFound()
    }
    return c.json(designerFonts)
})

export default designersApp