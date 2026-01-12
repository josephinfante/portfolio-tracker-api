import { environment } from "@shared/config/environment";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
	connectionString: environment.DB_URL,
	ssl: false,
});

export const db = drizzle(pool);

export type Drizzle = typeof db;
