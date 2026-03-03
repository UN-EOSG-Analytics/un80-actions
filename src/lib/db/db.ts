import { Pool } from "pg";

const globalForDb = global as unknown as { pool: Pool | undefined };

// Build connection config from DATABASE_URL
function getConnectionConfig() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("Missing required environment variable: DATABASE_URL");
  }

  return {
    connectionString,
    max: 2, // Lower for serverless to avoid connection exhaustion
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000, // 15s for slow/cold connections (e.g. Azure, VPN)
    keepAlive: true, // Prevent Azure network layer from resetting idle TCP connections
  };
}

export const pool = globalForDb.pool || new Pool(getConnectionConfig());

// Prevent unhandled ECONNRESET errors from idle clients being dropped by Azure's network layer
pool.on("error", (err) => {
  console.error("Unexpected pg pool error:", err.message);
});

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export async function query<T = unknown>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result.rows;
  } finally {
    client.release();
  }
}

export default pool;
