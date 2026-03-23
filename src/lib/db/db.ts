import { Pool } from "pg";

const globalForDb = global as unknown as { pool: Pool | undefined };

// DATABASE_URL_APP takes precedence to avoid conflicts with Replit's injected DATABASE_URL
const connectionString =
  process.env.DATABASE_URL_APP || process.env.DATABASE_URL;
if (!connectionString)
  throw new Error(
    "Missing required environment variable: DATABASE_URL_APP or DATABASE_URL",
  );

// Connects via PgBouncer (port 6432, transaction mode) on Azure PostgreSQL Flexible Server.
// max:1 — PgBouncer handles server-side pooling; one client per Vercel function instance is enough.
// allowExitOnIdle — lets the serverless process terminate without waiting on idle pool connections.
export const pool =
  globalForDb.pool ||
  new Pool({
    connectionString,
    max: 1,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
    allowExitOnIdle: true,
  });

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

// RLS-aware query: wraps the SQL in a transaction with SET LOCAL app.current_user_email.
// PostgreSQL RLS policies use current_setting('app.current_user_email', true) to scope rows.
// PgBouncer transaction mode ensures SET LOCAL is isolated to this transaction.
export async function queryWithUser<T = unknown>(
  userEmail: string,
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.current_user_email', $1, true)", [
      userEmail.toLowerCase(),
    ]);
    const result = await client.query(text, params);
    await client.query("COMMIT");
    return result.rows;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export default pool;
