import { Hono } from 'hono'

const webp = new Hono()

webp.get('/:font/webp', (c) => {
    const font = c.req.param('font')
    if (!font) {
        return c.notFound()
    }
    const fontStyle = c.req.query('style')
    return c.redirect(`/public/fonts/webp/${font}/${fontStyle || 'regular'}.webp`)
})

export default webp