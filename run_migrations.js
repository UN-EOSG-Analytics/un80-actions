#!/usr/bin/env node

/**
 * Run SQL migrations 003 through 013
 * This script uses the same database connection as the Next.js app
 */

const { readFileSync } = require('fs');
const { join } = require('path');
const { Pool } = require('pg');
const dns = require('dns');

// Try to use Google DNS for resolution
dns.setServers(['8.8.8.8', '1.1.1.1']);

// Build connection config from environment variables
function getConnectionConfig() {
  const host = process.env.AZURE_POSTGRES_HOST;
  const user = process.env.AZURE_POSTGRES_USER;
  const password = process.env.AZURE_POSTGRES_PASSWORD;
  const database = process.env.AZURE_POSTGRES_DB || 'postgres';
  const port = parseInt(process.env.AZURE_POSTGRES_PORT || '5432', 10);

  if (!host || !user || !password) {
    throw new Error(
      'Missing required environment variables: AZURE_POSTGRES_HOST, AZURE_POSTGRES_USER, AZURE_POSTGRES_PASSWORD'
    );
  }

  return {
    host,
    user,
    password,
    database,
    port,
    ssl: { rejectUnauthorized: false },
    options: '-c search_path=un80actions,systemchart,public',
  };
}

async function runMigration(migrationNumber, migrationName) {
  const pool = new Pool(getConnectionConfig());
  
  try {
    // Read migration file
    const migrationFile = join(__dirname, 'sql', 'migrations', `${String(migrationNumber).padStart(3, '0')}_${migrationName}.sql`);
    const migrationSQL = readFileSync(migrationFile, 'utf-8');
    
    console.log(`Running migration ${migrationNumber}...`);
    
    const client = await pool.connect();
    try {
      await client.query(migrationSQL);
      await client.query('COMMIT');
      console.log(`✓ Migration ${migrationNumber} applied successfully!`);
    } finally {
      client.release();
    }
    
    await pool.end();
  } catch (error) {
    console.error(`✗ Migration ${migrationNumber} failed:`, error.message);
    await pool.end();
    throw error;
  }
}

async function runAllMigrations() {
  try {
    // Run migration 003
    await runMigration(3, 'add_legal_comment_reply_to');
    
    // Run migration 004
    await runMigration(4, 'add_question_fields');
    
    // Run migration 005
    await runMigration(5, 'add_note_fields');
    
    // Run migration 006
    await runMigration(6, 'add_serial_number_to_milestones');
    
    // Run migration 007
    await runMigration(7, 'add_milestone_id_to_questions');
    
    // Run migration 008
    await runMigration(8, 'add_needs_ola_review_to_milestones');
    
    // Run migration 009
    await runMigration(9, 'add_activity_entries_and_read');
    
    // Run migration 010
    await runMigration(10, 'add_document_submitted_to_actions');
    
    // Run migration 011
    await runMigration(11, 'add_question_comment');
    
    // Run migration 012
    await runMigration(12, 'add_attachment_comments');
    
    // Run migration 013
    await runMigration(13, 'add_user_id_to_attachment_comments');
    
    console.log('\n✅ All migrations completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Load environment variables from .env file
require('dotenv').config();

runAllMigrations().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
