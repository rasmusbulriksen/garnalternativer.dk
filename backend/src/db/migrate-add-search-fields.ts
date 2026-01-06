import { pool } from './index.js';

async function migrate() {
  console.log('🔄 Starting migration: Adding search_fields column to yarn table...\n');

  try {
    console.log('1. Adding search_fields column...');
    await pool.query(`
      ALTER TABLE yarn 
      ADD COLUMN IF NOT EXISTS search_fields TEXT[];
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

