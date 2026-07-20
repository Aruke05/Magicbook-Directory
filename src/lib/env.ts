import "server-only"
import { z } from "zod"

const envSchema = z.object({
  ADMIN_USERNAME: z.string().min(1),
  ADMIN_PASSWORD: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  DATABASE_PATH: z.string().min(1).default("./data/magicbook.db"),
})

export function getEnv() {
  return envSchema.parse({
    ADMIN_USERNAME: process.env.ADMIN_USERNAME,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    SESSION_SECRET: process.env.SESSION_SECRET,
    DATABASE_PATH: process.env.DATABASE_PATH,
  })
}
