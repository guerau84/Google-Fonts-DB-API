import { Hono } from 'hono'

const licenses = new Hono()

licenses.get('/licenses', (c) => {
    // LIST ALL LICENSES
    return c.text('OK')
}).get('/licenses/:license', (c) => {
    // GET LICENSE BY NAME
    return c.text('OK')
})

export default licenses