import { pool } from '../db/index.js';
import type { Product } from './parser.js';

const BATCH_SIZE = 500;

type RetailerUpsertInput = {
  name: string;
  product_feed_url: string;
  banner_id?: number;
  feed_id?: number;
};

export async function ensureRetailer(input: RetailerUpsertInput): Promise<number> {
  const query = `
    INSERT INTO retailer (name, product_feed_url, banner_id, feed_id)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (product_feed_url) DO UPDATE SET
      name = EXCLUDED.name,
      banner_id = COALESCE(EXCLUDED.banner_id, retailer.banner_id),
      feed_id = COALESCE(EXCLUDED.feed_id, retailer.feed_id),
      updated_at = CURRENT_TIMESTAMP
    RETURNING retailer_id
  `;

  const { rows } = await pool.query(query, [
    input.name,
    input.product_feed_url,
    input.banner_id ?? null,
    input.feed_id ?? null,
  ]);

  return rows[0].retailer_id as number;
}

/**
 * Import products into the database using upsert
 * Batches inserts for better performance with large feeds
 */
export async function importProducts(products: Product[], retailerId: number): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;
  
  // Process in batches
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    const result = await insertBatch(batch, retailerId);
    inserted += result.inserted;
    updated += result.updated;
    
    console.log(`  ⏳ Processed ${Math.min(i + BATCH_SIZE, products.length)}/${products.length} products`);
  }
  
  return { inserted, updated };
}

async function insertBatch(products: Product[], retailerId: number): Promise<{ inserted: number; updated: number }> {
  if (products.length === 0) return { inserted: 0, updated: 0 };
  
  // Build parameterized query for batch insert
  const values: unknown[] = [];
  const valueRows: string[] = [];
  
  products.forEach((product, index) => {
    const offset = index * 9;
    valueRows.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`);
    values.push(
      retailerId,
      product.retailers_product_id,
      product.brand,
      product.name,
      product.category,
      product.price_before_discount,
      product.price_after_discount,
      product.stock_status,
      product.url
    );
  });
  
  const query = `
    INSERT INTO product_imported (retailer_id, retailers_product_id, brand, name, category, price_before_discount, price_after_discount, stock_status, url)
    VALUES ${valueRows.join(', ')}
  `;
  
  const result = await pool.query(query, values);
  
  // All rows are inserts; no updates happen without a conflict target
  return { inserted: result.rowCount ?? products.length, updated: 0 };
}

