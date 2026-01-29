import { Pool } from "pg";

const globalForDb = global as unknown as { pool: Pool | undefined };

// Build connection string from Azure Postgres environment variables
function getConnectionConfig() {
  const host = process.env.AZURE_POSTGRES_HOST;
  const user = process.env.AZURE_POSTGRES_USER;
  const password = process.env.AZURE_POSTGRES_PASSWORD;
  const database = process.env.AZURE_POSTGRES_DB || "postgres";
  const port = parseInt(process.env.AZURE_POSTGRES_PORT || "5432", 10);

  if (!host || !user || !password) {
    throw new Error(
      "Missing required environment variables: AZURE_POSTGRES_HOST, AZURE_POSTGRES_USER, AZURE_POSTGRES_PASSWORD"
    );
  }

  return {
    host,
    user,
    password,
    database,
    port,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    options: "-c search_path=un80actions,systemchart,public",
  };
}

export const pool = globalForDb.pool || new Pool(getConnectionConfig());

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export async function query<T = unknown>(text: string, params?: unknown[]): Promise<T[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result.rows;
  } finally {
    client.release();
  }
}

export default pool;
