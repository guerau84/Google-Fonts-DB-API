import { Hono } from 'hono'

const webp = new Hono()

webp.get('/:font/webp', (c) => {
    const font = c.req.param('font').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")
    if (!font) {
        return c.notFound()
    }
    const fontStyle = c.req.query('style')?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")
    // future: add support for multiple styles
    return c.redirect(`/public/fonts/${font}/webp/regular.webp`)
})

export default webp