import { createClient } from '@libsql/client'

const readAndWriteDb = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
})

const readOnlyDb = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN_READ_ONLY!,
})

export { readAndWriteDb, readOnlyDb }