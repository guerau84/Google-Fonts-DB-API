import { Hono } from 'hono'
import search from './search.js'
import svg from './svg.js'
import png from './png.js'
import webp from './webp.js'

const fonts = new Hono()

fonts.route('/', search)
fonts.route('/', svg)
fonts.route('/', png)
fonts.route('/', webp)

fonts.get('/', (c) => {
    // LIST ALL FONTS
    return c.text('OK')
}).get('/:font', (c) => {
    // GET FONT BY NAME
    const font = c.req.param('font')
    if (!font) {
        return c.text('Font not found', 404)
    }
    return c.text('OK')
})

export default fonts