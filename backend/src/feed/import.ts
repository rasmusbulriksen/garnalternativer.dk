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

function sanitizeFilename(name: string): string {
  // Replace invalid filename characters with underscores
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '');
}

function saveFeedToFile(xmlContent: string, retailerName: string): void {
  const feedsDir = path.join(__dirname, '../../xml-product-feeds');
  
  // Ensure directory exists
  if (!fs.existsSync(feedsDir)) {
    fs.mkdirSync(feedsDir, { recursive: true });
  }
  
  // Create filename from retailer name
  const filename = `${sanitizeFilename(retailerName)}.xml`;
  const filePath = path.join(feedsDir, filename);
  
  // Write the XML content
  fs.writeFileSync(filePath, xmlContent, 'utf-8');
  console.log(`  💾 Saved feed to: ${filePath}`);
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

      // Save the raw feed before parsing
      saveFeedToFile(xmlContent, retailer.name);

      // Parse the feed (pass retailerId for special filtering rules)
      const products = parseProductFeedFromXml(xmlContent, retailerId);

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
    search_fields: string[] | null;
    negative_keywords: string[] | null;
  }>(`SELECT yarn_id, search_query, search_fields, negative_keywords FROM yarn WHERE search_query IS NOT NULL`);

  const yarnMatchCounts = new Map<number, number>();

  for (const yarn of yarns.rows) {
    if (!yarn.search_query) continue;
    // Process negative keywords: add % wildcards if not already present
    // Filter out empty strings first to avoid matching everything
    const neg = yarn.negative_keywords && yarn.negative_keywords.length > 0
      ? yarn.negative_keywords
          .map(kw => kw.trim())
          .filter(kw => kw.length > 0) // Remove empty strings
          .map(kw => {
            // If keyword doesn't start with %, add it
            // If keyword doesn't end with %, add it
            let processed = kw;
            if (!processed.startsWith('%')) processed = `%${processed}`;
            if (!processed.endsWith('%')) processed = `${processed}%`;
            return processed;
          })
      : [];

    // Determine which fields to search
    // Default to name-only if search_fields is NULL or empty (backward compatibility)
    // Valid fields: 'name', 'brand', 'category'
    const searchFields = yarn.search_fields && yarn.search_fields.length > 0
      ? yarn.search_fields.map(f => f.toLowerCase().trim()).filter(f => ['name', 'brand', 'category'].includes(f))
      : ['name']; // Default to name-only search

    // Build WHERE clause for multi-field search
    // Always include name search, optionally add brand and category
    const searchConditions: string[] = [];
    const searchPattern = `%${yarn.search_query}%`;
    
    if (searchFields.includes('name')) {
      searchConditions.push('pi.name ILIKE $2');
    }
    if (searchFields.includes('brand')) {
      searchConditions.push('pi.brand ILIKE $2');
    }
    if (searchFields.includes('category')) {
      searchConditions.push('pi.category ILIKE $2');
    }

    // Combine conditions with OR - product matches if ANY field matches
    const whereClause = searchConditions.length > 0 
      ? `(${searchConditions.join(' OR ')})`
      : 'pi.name ILIKE $2'; // Fallback to name-only if somehow no fields selected

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
      WHERE ${whereClause}
        AND ($3::text[] IS NULL OR array_length($3::text[], 1) IS NULL OR NOT (pi.name ILIKE ANY ($3::text[])))
        AND pi.price_after_discount IS NOT NULL
      ORDER BY pi.retailer_id, pi.price_after_discount ASC, pi.product_imported_id ASC
      RETURNING *;
      `,
      [yarn.yarn_id, searchPattern, neg.length > 0 ? neg : null]
    );

    yarnMatchCounts.set(yarn.yarn_id, aggRows.rowCount ?? 0);
    console.log(`  🧶 Aggregated yarn ${yarn.yarn_id}: inserted ${aggRows.rowCount} rows`);
  }

  // Update yarn.lowest_price_on_the_market based on lowest price_after_discount from product_aggregated
  console.log('\n💰 Updating lowest prices...');
  const priceUpdateResult = await pool.query(
    `
    UPDATE yarn
    SET 
      lowest_price_on_the_market = (
        SELECT MIN(price_after_discount::numeric)::int
        FROM product_aggregated
        WHERE product_aggregated.yarn_id = yarn.yarn_id
          AND price_after_discount IS NOT NULL
      ),
      updated_at = NOW()
    WHERE yarn_id IN (
      SELECT DISTINCT yarn_id 
      FROM product_aggregated 
      WHERE price_after_discount IS NOT NULL
    )
    `
  );
  console.log(`  ✅ Updated lowest prices for ${priceUpdateResult.rowCount} yarns`);

  // Update double yarn prices and activation based on component yarns
  console.log('\n🧶 Processing double yarns...');
  const doubleYarnsResult = await pool.query(`
    SELECT 
      y.yarn_id,
      y.main_yarn_id,
      y.carry_along_yarn_id
    FROM yarn y
    WHERE y.yarn_type = 'double'
  `);

  const doubleYarnUpdates = new Map<number, { hasRetailer: boolean; lowestPrice: number | null }>();

  for (const doubleYarn of doubleYarnsResult.rows) {
    // Find retailers that have BOTH component yarns in stock
    const retailersWithBothResult = await pool.query(`
      SELECT 
        main_pa.retailer_id,
        main_pa.price_after_discount::numeric as main_price,
        carry_pa.price_after_discount::numeric as carry_price,
        (main_pa.price_after_discount::numeric + carry_pa.price_after_discount::numeric)::int as combined_price
      FROM product_aggregated main_pa
      INNER JOIN product_aggregated carry_pa ON main_pa.retailer_id = carry_pa.retailer_id
      WHERE main_pa.yarn_id = $1
        AND carry_pa.yarn_id = $2
        AND main_pa.stock_status = 'in stock'
        AND carry_pa.stock_status = 'in stock'
        AND main_pa.price_after_discount IS NOT NULL
        AND carry_pa.price_after_discount IS NOT NULL
      ORDER BY combined_price ASC
    `, [doubleYarn.main_yarn_id, doubleYarn.carry_along_yarn_id]);

    const hasRetailer = retailersWithBothResult.rows.length > 0;
    const lowestPrice = hasRetailer 
      ? retailersWithBothResult.rows[0].combined_price 
      : null;

    doubleYarnUpdates.set(doubleYarn.yarn_id, { hasRetailer, lowestPrice });
  }

  // Update double yarn prices and activation status
  for (const [yarnId, update] of doubleYarnUpdates.entries()) {
    await pool.query(
      `
      UPDATE yarn
      SET 
        lowest_price_on_the_market = $1,
        is_active = $2,
        active_since = CASE WHEN $2 = TRUE AND active_since IS NULL THEN NOW() ELSE active_since END,
        inactive_since = CASE WHEN $2 = FALSE THEN NOW() ELSE inactive_since END,
        updated_at = NOW()
      WHERE yarn_id = $3
      `,
      [update.lowestPrice, update.hasRetailer, yarnId]
    );
  }
  console.log(`  ✅ Processed ${doubleYarnUpdates.size} double yarns`);

  // Update yarn.price_per_meter based on lowest_price_on_the_market / skein_length
  // This now includes both single and double yarns
  console.log('\n📏 Calculating price per meter...');
  const pricePerMeterResult = await pool.query(
    `
    UPDATE yarn
    SET 
      price_per_meter = CASE
        WHEN skein_length IS NOT NULL AND skein_length > 0 AND lowest_price_on_the_market IS NOT NULL
        THEN (lowest_price_on_the_market::numeric / skein_length::numeric)
        ELSE NULL
      END,
      updated_at = NOW()
    WHERE lowest_price_on_the_market IS NOT NULL
      AND skein_length IS NOT NULL
      AND skein_length > 0
    `
  );
  console.log(`  ✅ Updated price per meter for ${pricePerMeterResult.rowCount} yarns`);

  // Update yarn.is_active based on whether matches were found (for single yarns only)
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
        AND yarn_type = 'single'
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

