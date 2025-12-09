import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import { URL } from 'url';
import { pool } from '../db/index.js';
import { parseProductFeedFromXml } from './parser.js';
import { importProducts, ensureRetailer } from './importer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Retailer {
  name: string;
  product_feed_url?: string;
  banner_id?: number | string;
  feed_id?: number | string;
}

interface RetailersConfig {
  retailers: Retailer[];
}

const PARTNER_ID = process.env.PARTNER_ID || '46912';

function buildFeedUrl(retailer: Retailer): string {
  if (retailer.product_feed_url) return retailer.product_feed_url;
  if (!retailer.banner_id || !retailer.feed_id) {
    throw new Error(`Missing banner_id or feed_id for retailer ${retailer.name}`);
  }
  return `https://www.partner-ads.com/dk/feed_udlaes.php?partnerid=${PARTNER_ID}&bannerid=${retailer.banner_id}&feedid=${retailer.feed_id}`;
}

async function fetchFeed(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(new URL(url), res => {
      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('latin1')));
    }).on('error', reject);
  });
}

async function main() {
  console.log('🚀 Starting product feed import...\n');
  
  const startTime = Date.now();
  // Read retailers config
  const retailersPath = path.join(__dirname, '../../retailers.json');
  const retailersConfig: RetailersConfig = JSON.parse(
    fs.readFileSync(retailersPath, 'utf-8')
  );
  
  // Development: full refresh each run (truncate both due to FK)
  await pool.query('TRUNCATE TABLE product_aggregated, product_imported RESTART IDENTITY CASCADE');
  
  let totalInserted = 0;
  let totalUpdated = 0;
  
  for (const retailer of retailersConfig.retailers) {
    console.log(`\n📦 Processing: ${retailer.name}`);
    console.log('─'.repeat(40));
    
    const bannerId = retailer.banner_id !== undefined ? Number(retailer.banner_id) : undefined;
    const feedId = retailer.feed_id !== undefined ? Number(retailer.feed_id) : undefined;
    const feedUrl = buildFeedUrl({ ...retailer, banner_id: bannerId, feed_id: feedId });
    
    try {
      // Ensure retailer exists and get id
      const retailerId = await ensureRetailer({
        name: retailer.name,
        product_feed_url: feedUrl,
        banner_id: bannerId,
        feed_id: feedId,
      });

      console.log(`  🌐 Fetching feed: ${feedUrl}`);
      const xmlContent = await fetchFeed(feedUrl);

      // Parse the feed
      const products = parseProductFeedFromXml(xmlContent);

      if (products.length === 0) {
        console.log('  ⚠️  No yarn products found in feed');
        continue;
      }

      // Import to database
      const { inserted, updated } = await importProducts(products, retailerId);

      totalInserted += inserted;
      totalUpdated += updated;

      console.log(`  ✅ Completed: ${inserted} inserted, ${updated} updated`);
    } catch (error) {
      console.error(`  ❌ Error processing ${retailer.name}:`, error);
    }
  }

  // Aggregate: for each yarn, pick cheapest per retailer
  const yarns = await pool.query<{
    yarn_id: number;
    search_query: string | null;
    negative_keywords: string[] | null;
  }>(`SELECT yarn_id, search_query, negative_keywords FROM yarn WHERE search_query IS NOT NULL`);

  const yarnMatchCounts = new Map<number, number>();

  for (const yarn of yarns.rows) {
    if (!yarn.search_query) continue;
    const neg = yarn.negative_keywords && yarn.negative_keywords.length > 0
      ? yarn.negative_keywords
      : [];

    // Select cheapest per retailer using DISTINCT ON
    const aggRows = await pool.query<{
      product_imported_id: number;
      retailer_id: number;
      retailers_product_id: string;
      brand: string | null;
      name: string;
      category: string | null;
      price_before_discount: string | null;
      price_after_discount: string | null;
      stock_status: string | null;
      url: string;
    }>(
      `
      INSERT INTO product_aggregated (
        product_imported_id,
        retailer_id,
        yarn_id,
        retailers_product_id,
        brand,
        name,
        category,
        price_before_discount,
        price_after_discount,
        stock_status,
        url,
        created_at,
        updated_at
      )
      SELECT DISTINCT ON (pi.retailer_id)
        pi.product_imported_id,
        pi.retailer_id,
        $1::int AS yarn_id,
        pi.retailers_product_id,
        pi.brand,
        pi.name,
        pi.category,
        pi.price_before_discount,
        pi.price_after_discount,
        pi.stock_status,
        pi.url,
        NOW(),
        NOW()
      FROM product_imported pi
      WHERE pi.name ILIKE $2
        AND ($3::text[] IS NULL OR array_length($3::text[], 1) IS NULL OR NOT (pi.name ILIKE ANY ($3::text[])))
      ORDER BY pi.retailer_id, pi.price_after_discount ASC NULLS LAST, pi.product_imported_id ASC
      RETURNING *;
      `,
      [yarn.yarn_id, `%${yarn.search_query}%`, neg.length > 0 ? neg : null]
    );

    yarnMatchCounts.set(yarn.yarn_id, aggRows.rowCount ?? 0);
    console.log(`  🧶 Aggregated yarn ${yarn.yarn_id}: inserted ${aggRows.rowCount} rows`);
  }

  // Update yarn.is_active based on whether matches were found
  for (const [yarnId, matchCount] of yarnMatchCounts.entries()) {
    const hasMatches = matchCount > 0;
    await pool.query(
      `
      UPDATE yarn
      SET 
        is_active = $1,
        active_since = CASE WHEN $1 = TRUE AND active_since IS NULL THEN NOW() ELSE active_since END,
        inactive_since = CASE WHEN $1 = FALSE THEN NOW() ELSE inactive_since END,
        updated_at = NOW()
      WHERE yarn_id = $2
      `,
      [hasMatches, yarnId]
    );
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('\n' + '═'.repeat(40));
  console.log(`✅ Import complete!`);
  console.log(`   Total inserted: ${totalInserted}`);
  console.log(`   Total updated: ${totalUpdated}`);
  console.log(`   Duration: ${duration}s`);
  console.log('═'.repeat(40));
  
  await pool.end();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

