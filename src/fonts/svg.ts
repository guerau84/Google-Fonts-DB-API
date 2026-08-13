import { Hono } from 'hono'

const svg = new Hono()

svg.get('/:font/svg', (c) => {
    const font = c.req.param('font')
    if (!font) {
        return c.notFound()
    }
    const fontStyle = c.req.query('style')
    return c.redirect(`/public/fonts/svg/${font}/${fontStyle || 'regular'}.svg`)
})

export default svg