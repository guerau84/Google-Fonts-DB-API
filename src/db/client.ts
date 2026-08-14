import { createClient } from '@libsql/client'

const url = process.env.TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN
const authTokenReadOnly = process.env.TURSO_AUTH_TOKEN_READ_ONLY

if (!url) {
    throw new Error('Missing TURSO_DATABASE_URL')
}

if (!authToken) {
    throw new Error('Missing TURSO_AUTH_TOKEN')
}

const readAndWriteDb = createClient({
    url: url!,
    authToken: authToken!,
})

const readOnlyDb = createClient({
    url: url!,
    authToken: authTokenReadOnly!,
})

export { readAndWriteDb, readOnlyDb }