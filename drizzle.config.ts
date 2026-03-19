import { defineConfig } from 'drizzle-kit'

export default defineConfig({
	schema: './lib/db/schema.ts',
	dialect: 'postgresql',
	dbCredentials: {
		url: process.env.UAT_DATABASE_URL!,
	},
})
