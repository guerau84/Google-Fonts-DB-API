import { createClient } from '@libsql/client'
import fonts from '../data/fonts.json' with { type: 'json' }

const db = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
})

// await db.execute(`
//   CREATE TABLE IF NOT EXISTS fonts (
//     id INTEGER PRIMARY KEY,
//     family TEXT NOT NULL,
//     category TEXT,
//     designer TEXT,
//     license TEXT,
//     subsets TEXT
//   )
// `)

for (const [index, font] of fonts.entries()) {
    await db.execute({
        sql: `
      INSERT INTO fonts (
        id,
        family,
        category,
        designer,
        license,
        subsets
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `,
        args: [
            index + 1,
            font.family,
            font.category,
            font.designer?.name ?? null,
            font.license ?? null,
            JSON.stringify(font.subsets ?? []),
        ],
    })
}

console.log(`Imported ${fonts.length} fonts`)