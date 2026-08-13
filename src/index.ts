import { Hono } from 'hono'
import fonts from './fonts/index.js'
import categories from './categories.js'
import designers from './designers.js'
import licenses from './licenses.js'
import subsets from './subsets.js'
import stats from './data/stats.json' with { type: 'json' }
import { readOnlyDb } from './db/client.js'

const app = new Hono()

app.route('/fonts', fonts)
app.route('/categories', categories)
app.route('/designers', designers)
app.route('/licenses', licenses)
app.route('/subsets', subsets)

app.get('/health', (c) => {
  return c.text('OK', 200)
})

app.get('/ready', async (c) => {
  try {
    await readOnlyDb.execute('SELECT 1')

    return c.json({
      status: 'ok',
      dependencies: {
        database: 'ok',
      },
    })
  } catch (error) {
    return c.json(
      {
        status: 'not_ready',
        dependencies: {
          database: 'error',
        },
      },
      503
    )
  }
})


app.get('/stats', (c) => {
  return c.json(stats)
})

export default app
