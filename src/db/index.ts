import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

// Untuk query (connection pool)
const client = postgres(connectionString);

// Export drizzle instance dengan schema untuk relational queries
export const db = drizzle({ client, schema });
