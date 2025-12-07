import { pool } from '../db/index.js';
import type { Product } from './parser.js';

const BATCH_SIZE = 500;

/**
 * Import products into the database using upsert
 * Batches inserts for better performance with large feeds
 */
export async function importProducts(products: Product[]): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;
  
  // Process in batches
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    const result = await upsertBatch(batch);
    inserted += result.inserted;
    updated += result.updated;
    
    console.log(`  ⏳ Processed ${Math.min(i + BATCH_SIZE, products.length)}/${products.length} products`);
  }
  
  return { inserted, updated };
}

async function upsertBatch(products: Product[]): Promise<{ inserted: number; updated: number }> {
  if (products.length === 0) return { inserted: 0, updated: 0 };
  
  // Build parameterized query for batch upsert
  const values: unknown[] = [];
  const valueRows: string[] = [];
  
  products.forEach((product, index) => {
    const offset = index * 11;
    valueRows.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11})`);
    values.push(
      product.forhandler,
      product.brand,
      product.produktnavn,
      product.produktid,
      product.nypris,
      product.glpris,
      product.fragtomk,
      product.lagerantal,
      product.leveringstid,
      product.color,
      product.vareurl
    );
  });
  
  const query = `
    INSERT INTO products (forhandler, brand, produktnavn, produktid, nypris, glpris, fragtomk, lagerantal, leveringstid, color, vareurl)
    VALUES ${valueRows.join(', ')}
    ON CONFLICT (forhandler, produktid) DO UPDATE SET
      brand = EXCLUDED.brand,
      produktnavn = EXCLUDED.produktnavn,
      nypris = EXCLUDED.nypris,
      glpris = EXCLUDED.glpris,
      fragtomk = EXCLUDED.fragtomk,
      lagerantal = EXCLUDED.lagerantal,
      leveringstid = EXCLUDED.leveringstid,
      color = EXCLUDED.color,
      vareurl = EXCLUDED.vareurl,
      updated_at = CURRENT_TIMESTAMP
    RETURNING (xmax = 0) AS inserted
  `;
  
  const result = await pool.query(query, values);
  
  // Count inserts vs updates
  const insertedCount = result.rows.filter(row => row.inserted).length;
  const updatedCount = result.rows.length - insertedCount;
  
  return { inserted: insertedCount, updated: updatedCount };
}

