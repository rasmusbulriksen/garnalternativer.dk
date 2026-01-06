import { pool } from './index.js';

async function migrate() {
  console.log('🔄 Starting migration: Adding expanded_search_query column to yarn table...\n');

  try {
    console.log('Adding expanded_search_query column...');
    await pool.query(`
      ALTER TABLE yarn 
      ADD COLUMN IF NOT EXISTS expanded_search_query TEXT;
    `);
    console.log('   ✅ Column added\n');

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();

