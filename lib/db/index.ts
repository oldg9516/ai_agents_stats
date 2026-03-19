import 'server-only'

import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool, types } from 'pg'

import * as schema from './schema'
import { getDatabaseUrl } from '@/lib/utils/env'

// pg returns numeric/int8/float types as strings by default.
// Override parsers to return JS numbers (matches Supabase behavior).
types.setTypeParser(20, Number)    // int8 (bigint)
types.setTypeParser(1700, Number)  // numeric
types.setTypeParser(700, Number)   // float4
types.setTypeParser(701, Number)   // float8

const pool = new Pool({
	connectionString: getDatabaseUrl(),
	max: 5,
	idleTimeoutMillis: 10000,
	ssl: { rejectUnauthorized: false },
})

export const db = drizzle(pool, { schema })
