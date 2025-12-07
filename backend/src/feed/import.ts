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

