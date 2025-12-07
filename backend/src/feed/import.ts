import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../db/index.js';
import { parseProductFeed } from './parser.js';
import { importProducts, ensureRetailer } from './importer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Retailer {
  name: string;
  product_feed_url: string;
  banner_id?: number;
  feed_id?: number;
}

interface RetailersConfig {
  retailers: Retailer[];
}

async function main() {
  console.log('🚀 Starting product feed import...\n');
  
  const startTime = Date.now();
  // Read retailers config
  const retailersPath = path.join(__dirname, '../../retailers.json');
  const retailersConfig: RetailersConfig = JSON.parse(
    fs.readFileSync(retailersPath, 'utf-8')
  );
  
  const feedsDir = path.join(__dirname, '../../xml-product-feeds-for-dev');
  
  let totalInserted = 0;
  let totalUpdated = 0;
  
  for (const retailer of retailersConfig.retailers) {
    console.log(`\n📦 Processing: ${retailer.name}`);
    console.log('─'.repeat(40));
    
    const feedPath = path.join(feedsDir, `${retailer.name}.xml`);
    
    // Check if feed file exists
    if (!fs.existsSync(feedPath)) {
      console.log(`  ⚠️  Feed file not found: ${feedPath}`);
      continue;
    }
    
    try {
      // Ensure retailer exists and get id
      const retailerId = await ensureRetailer({
        name: retailer.name,
        product_feed_url: retailer.product_feed_url,
        banner_id: retailer.banner_id,
        feed_id: retailer.feed_id,
      });

      // Parse the feed
      const products = parseProductFeed(feedPath);

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

