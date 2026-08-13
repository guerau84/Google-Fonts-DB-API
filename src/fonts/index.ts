import { Hono } from 'hono'
import search from './search.js'
import svg from './svg.js'
import png from './png.js'
import webp from './webp.js'
import fonts from '../data/fonts.json' with { type: 'json' }

const fontsApp = new Hono()

fontsApp.route('/', search)
fontsApp.route('/', svg)
fontsApp.route('/', png)
fontsApp.route('/', webp)

fontsApp.get('/', (c) => {
    return c.json(fonts)
}).get('/:font', (c) => {
    const font = c.req.param('font')
    if (!font) {
        return c.notFound()
    }
    const fontData = fonts.find((font: any) => font.id === font)
    if (!fontData) {
        return c.notFound()
    }
    return c.json(fontData)
})

export default fontsApp