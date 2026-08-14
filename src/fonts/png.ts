import { Hono } from 'hono'

const png = new Hono()

png.get('/:font/png', (c) => {
    const font = c.req.param('font').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")
    if (!font) {
        return c.notFound()
    }
    const fontStyle = c.req.query('style')?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")
    // future: add support for multiple styles
    return c.redirect(`/fonts/${font}/png/regular.png`)
})

export default png