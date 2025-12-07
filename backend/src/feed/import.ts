import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../db/index.js';
import { parseProductFeed } from './parser.js';
import { importProducts } from './importer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Merchant {
  name: string;
  product_feed_url: string;
}

interface MerchantsConfig {
  merchants: Merchant[];
}

async function main() {
  console.log('🚀 Starting product feed import...\n');
  
  const startTime = Date.now();
  
  // Read merchants config
  const merchantsPath = path.join(__dirname, '../../merchants.json');
  const merchantsConfig: MerchantsConfig = JSON.parse(
    fs.readFileSync(merchantsPath, 'utf-8')
  );
  
  const feedsDir = path.join(__dirname, '../../ProductFeeds');
  
  let totalInserted = 0;
  let totalUpdated = 0;
  
  for (const merchant of merchantsConfig.merchants) {
    console.log(`\n📦 Processing: ${merchant.name}`);
    console.log('─'.repeat(40));
    
    const feedPath = path.join(feedsDir, `${merchant.name}.xml`);
    
    // Check if feed file exists
    if (!fs.existsSync(feedPath)) {
      console.log(`  ⚠️  Feed file not found: ${feedPath}`);
      continue;
    }
    
    try {
      // Parse the feed
      const products = parseProductFeed(feedPath);
      
      if (products.length === 0) {
        console.log('  ⚠️  No yarn products found in feed');
        continue;
      }
      
      // Import to database
      const { inserted, updated } = await importProducts(products);
      
      totalInserted += inserted;
      totalUpdated += updated;
      
      console.log(`  ✅ Completed: ${inserted} inserted, ${updated} updated`);
    } catch (error) {
      console.error(`  ❌ Error processing ${merchant.name}:`, error);
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

