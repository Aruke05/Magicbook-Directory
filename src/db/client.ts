import "server-only"
import fs from "node:fs"
import path from "node:path"
import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import * as schema from "./schema"

const databasePath = path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.DATABASE_PATH ?? "./data/magicbook.db")
fs.mkdirSync(path.dirname(databasePath), { recursive: true })

const globalForDatabase = globalThis as unknown as { sqlite?: Database.Database }
const sqlite = globalForDatabase.sqlite ?? new Database(databasePath)
sqlite.pragma("journal_mode = WAL")
sqlite.pragma("foreign_keys = ON")
sqlite.pragma("busy_timeout = 5000")

if (process.env.NODE_ENV !== "production") globalForDatabase.sqlite = sqlite

export const db = drizzle(sqlite, { schema })
export { sqlite }
