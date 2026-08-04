import fs from "node:fs"
import path from "node:path"
import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { migrate } from "drizzle-orm/better-sqlite3/migrator"

const databasePath = path.resolve(process.cwd(), process.env.DATABASE_PATH ?? "./data/magicbook.db")
fs.mkdirSync(path.dirname(databasePath), { recursive: true })
const sqlite = new Database(databasePath)
sqlite.pragma("journal_mode = WAL")
sqlite.pragma("foreign_keys = ON")
migrate(drizzle(sqlite), { migrationsFolder: path.resolve(process.cwd(), "drizzle") })
sqlite.close()
console.log("数据库迁移完成")
