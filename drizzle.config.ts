import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/main/database/schema/index.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: './.data/mymind-dev.sqlite'
  },
  strict: true,
  verbose: true
})
