import { Hono } from 'hono'

const png = new Hono()

png.get('/:font/png', (c) => {
    const font = c.req.param('font')
    if (!font) {
        return c.notFound()
    }
    const fontStyle = c.req.query('style')
    return c.redirect(`/public/fonts/png/${font}/${fontStyle || 'regular'}.png`)
})

export default png