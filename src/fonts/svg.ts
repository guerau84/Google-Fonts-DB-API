import { Hono } from 'hono'

const svg = new Hono()

svg.get('/:font/svg', (c) => {
    // GET FONT SVG
    const font = c.req.param('font')
    if (!font) {
        return c.text('Font not found', 404)
    }
    const fontStyle = c.req.query('style')
    return c.redirect(`/public/fonts/svg/${font}/${fontStyle || 'regular'}.svg`)
})

export default svg