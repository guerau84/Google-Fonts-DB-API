import { Hono } from 'hono'

const designers = new Hono()

designers.get('/designers', (c) => {
    // LIST ALL DESIGNERS
    return c.text('OK')
}).get('/designers/:designer', (c) => {
    // GET DESIGNER BY NAME
    return c.text('OK')
})

export default designers