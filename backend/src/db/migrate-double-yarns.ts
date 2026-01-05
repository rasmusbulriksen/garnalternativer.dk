import { pool } from './index.js';

/**
 * Migration script to add double yarn support to existing database
 * Run this once to update your existing database schema
 */
async function migrate() {
  console.log('🔄 Starting migration: Adding double yarn support...\n');

  try {
    // Create yarn_type enum if it doesn't exist
    console.log('1. Creating yarn_type enum...');
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE yarn_type AS ENUM ('single', 'double');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('   ✅ Enum created\n');

    // Add new columns to yarn table
    console.log('2. Adding columns to yarn table...');
    await pool.query(`
      ALTER TABLE yarn 
      ADD COLUMN IF NOT EXISTS yarn_type yarn_type DEFAULT 'single' NOT NULL,
      ADD COLUMN IF NOT EXISTS main_yarn_id INT REFERENCES yarn(yarn_id),
      ADD COLUMN IF NOT EXISTS carry_along_yarn_id INT REFERENCES yarn(yarn_id);
    `);
    console.log('   ✅ Columns added\n');

    // Add constraint for double yarns
    console.log('3. Adding constraints...');
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE yarn
        DROP CONSTRAINT IF EXISTS double_yarn_components;
      EXCEPTION
        WHEN undefined_object THEN null;
      END $$;
      
      ALTER TABLE yarn
      ADD CONSTRAINT double_yarn_components CHECK (
        (yarn_type = 'single' AND main_yarn_id IS NULL AND carry_along_yarn_id IS NULL) OR
        (yarn_type = 'double' AND main_yarn_id IS NOT NULL AND carry_along_yarn_id IS NOT NULL AND main_yarn_id != carry_along_yarn_id)
      );
    `);
    console.log('   ✅ Constraints added\n');

    // Add indexes
    console.log('4. Adding indexes...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_yarn_type ON yarn(yarn_type);
      CREATE INDEX IF NOT EXISTS idx_yarn_main_yarn_id ON yarn(main_yarn_id);
      CREATE INDEX IF NOT EXISTS idx_yarn_carry_along_yarn_id ON yarn(carry_along_yarn_id);
    `);
    console.log('   ✅ Indexes created\n');

    console.log('✅ Migration complete!');
    console.log('\n📝 Next steps:');
    console.log('   - All existing yarns are now marked as type "single"');
    console.log('   - You can now insert double yarns using the new columns');
    console.log('   - Example: INSERT INTO yarn (name, yarn_type, main_yarn_id, carry_along_yarn_id, ...) VALUES (...);\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

