import { Hono } from 'hono'
import fonts from './data/fonts.json' with { type: 'json' }

const licensesApp = new Hono()

licensesApp.get('/', (c) => {
    const licenses = fonts.map((font: any) => font.license)
    return c.json(licenses)
}).get('/:licenseId', (c) => {
    const licenseId = c.req.param('licenseId')
    const license = fonts.find((license: any) => license.license === licenseId)
    if (!license) {
        return c.notFound()
    }
    return c.json(license)
})

export default licensesApp