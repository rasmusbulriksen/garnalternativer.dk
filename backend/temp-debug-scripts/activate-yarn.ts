import { pool } from '../src/db/index.js';

async function activateYarn(yarnId: number) {
  try {
    const result = await pool.query(`
      UPDATE yarn 
      SET is_active = TRUE, 
          active_since = CASE WHEN active_since IS NULL THEN NOW() ELSE active_since END,
          updated_at = NOW()
      WHERE yarn_id = $1
      RETURNING yarn_id, name, is_active
    `, [yarnId]);

    if (result.rows.length === 0) {
      console.error(`❌ Yarn with ID ${yarnId} not found`);
      process.exit(1);
    }

    console.log(`✅ Yarn activated:`, result.rows[0]);
  } catch (error) {
    console.error('❌ Error activating yarn:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

const yarnId = process.argv[2];
if (!yarnId) {
  console.error('Usage: tsx temp-debug-scripts/activate-yarn.ts <yarn_id>');
  process.exit(1);
}

activateYarn(parseInt(yarnId));

