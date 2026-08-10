import { Hono } from 'hono'
import fonts from './data/fonts.json' with { type: 'json' }

const licensesApp = new Hono()

licensesApp.get('/', (c) => {
    const licenses = [...new Set(fonts.map((font: any) => font.license))]
    return c.json(licenses)
}).get('/:licenseId', (c) => {
    const licenseId = c.req.param('licenseId')
    if (!licenseId) {
        return c.notFound()
    }
    const license = fonts.filter((font: any) => font.license === licenseId.toUpperCase())
    if (license.length === 0) {
        return c.notFound()
    }
    return c.json(license)
})

export default licensesApp