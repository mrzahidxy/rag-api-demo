import { Pool, QueryResult, QueryResultRow } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing in your environment variables.");
}

if (databaseUrl === "your_neon_postgresql_connection_string") {
  throw new Error("DATABASE_URL is still using the placeholder value in .env.");
}

let parsedDatabaseUrl;

try {
  parsedDatabaseUrl = new URL(databaseUrl);
} catch {
  throw new Error(
    "DATABASE_URL is not a valid URL. Use the full Neon connection string from the dashboard."
  );
}

if (!["postgres:", "postgresql:"].includes(parsedDatabaseUrl.protocol)) {
  throw new Error("DATABASE_URL must start with postgres:// or postgresql://.");
}

if (!parsedDatabaseUrl.hostname) {
  throw new Error("DATABASE_URL is missing a database hostname.");
}

if (!parsedDatabaseUrl.username) {
  throw new Error("DATABASE_URL is missing the database username.");
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  return pool.query(text, params);
}

function toVectorString(values: number[]): string {
  return `[${values.join(",")}]`;
}

export { pool, query, toVectorString };
