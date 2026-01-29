// App namespace/schema for database tables
export const DB_SCHEMA = process.env.DB_SCHEMA || "un80actions";

// Table names with schema prefix
export const tables = {
  users: `${DB_SCHEMA}.users`,
  magic_tokens: `${DB_SCHEMA}.magic_tokens`,
  approved_users: `${DB_SCHEMA}.approved_users`,
} as const;
