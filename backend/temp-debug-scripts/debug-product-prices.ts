import { pool } from '../src/db/index.js';

async function debugProductPrices(retailerName: string, productName: string) {
  try {
    console.log(`\n🔍 Debugging prices for: ${productName} from ${retailerName}\n`);
    console.log('─'.repeat(80));

    // First, find the retailer
    const retailerResult = await pool.query(
      'SELECT retailer_id, name FROM retailer WHERE name ILIKE $1',
      [`%${retailerName}%`]
    );

    if (retailerResult.rows.length === 0) {
      console.log(`❌ Retailer "${retailerName}" not found`);
      console.log('\nAvailable retailers:');
      const allRetailers = await pool.query('SELECT retailer_id, name FROM retailer ORDER BY name');
      allRetailers.rows.forEach(r => console.log(`  - ${r.name} (ID: ${r.retailer_id})`));
      return;
    }

    const retailer = retailerResult.rows[0];
    console.log(`✅ Found retailer: ${retailer.name} (ID: ${retailer.retailer_id})\n`);

    // Find products in product_imported
    console.log('📦 Products in product_imported:');
    console.log('─'.repeat(80));
    const importedProducts = await pool.query(`
      SELECT 
        product_imported_id,
        retailers_product_id,
        brand,
        name,
        price_before_discount,
        price_after_discount,
        stock_status,
        url,
        created_at
      FROM product_imported
      WHERE retailer_id = $1 
        AND name ILIKE $2
      ORDER BY price_after_discount ASC NULLS LAST, product_imported_id ASC
    `, [retailer.retailer_id, `%${productName}%`]);

    if (importedProducts.rows.length === 0) {
      console.log(`❌ No products found matching "${productName}"`);
      return;
    }

    importedProducts.rows.forEach((p, idx) => {
      console.log(`\n  Product ${idx + 1}:`);
      console.log(`    ID: ${p.product_imported_id}`);
      console.log(`    Retailer Product ID: ${p.retailers_product_id}`);
      console.log(`    Brand: ${p.brand || 'N/A'}`);
      console.log(`    Name: ${p.name}`);
      console.log(`    Price Before Discount: ${p.price_before_discount ?? 'NULL'} DKK`);
      console.log(`    Price After Discount: ${p.price_after_discount ?? 'NULL'} DKK`);
      console.log(`    Stock Status: ${p.stock_status || 'N/A'}`);
      console.log(`    URL: ${p.url}`);
      console.log(`    Created: ${p.created_at}`);
    });

    // Find aggregated products
    console.log('\n\n🧶 Products in product_aggregated:');
    console.log('─'.repeat(80));
    const aggregatedProducts = await pool.query(`
      SELECT 
        pa.product_aggregated_id,
        pa.product_imported_id,
        pa.yarn_id,
        y.name as yarn_name,
        pa.brand,
        pa.name,
        pa.price_before_discount,
        pa.price_after_discount,
        pa.stock_status,
        pa.url,
        pa.created_at
      FROM product_aggregated pa
      LEFT JOIN yarn y ON pa.yarn_id = y.yarn_id
      WHERE pa.retailer_id = $1 
        AND pa.name ILIKE $2
      ORDER BY pa.price_after_discount ASC NULLS LAST, pa.product_aggregated_id ASC
    `, [retailer.retailer_id, `%${productName}%`]);

    if (aggregatedProducts.rows.length === 0) {
      console.log(`❌ No aggregated products found matching "${productName}"`);
      console.log('\n💡 This means the product was not matched to any yarn during import.');
    } else {
      aggregatedProducts.rows.forEach((p, idx) => {
        console.log(`\n  Aggregated Product ${idx + 1}:`);
        console.log(`    Aggregated ID: ${p.product_aggregated_id}`);
        console.log(`    Imported Product ID: ${p.product_imported_id}`);
        console.log(`    Yarn ID: ${p.yarn_id}`);
        console.log(`    Yarn Name: ${p.yarn_name || 'N/A'}`);
        console.log(`    Brand: ${p.brand || 'N/A'}`);
        console.log(`    Name: ${p.name}`);
        console.log(`    Price Before Discount: ${p.price_before_discount ?? 'NULL'} DKK`);
        console.log(`    Price After Discount: ${p.price_after_discount ?? 'NULL'} DKK`);
        console.log(`    Stock Status: ${p.stock_status || 'N/A'}`);
        console.log(`    URL: ${p.url}`);
        console.log(`    Created: ${p.created_at}`);
      });
    }

    // Check what the API would return
    console.log('\n\n🌐 What the API would return:');
    console.log('─'.repeat(80));
    const apiResult = await pool.query(`
      SELECT 
        y.yarn_id,
        y.name as yarn_name,
        r.name as retailer_name,
        pa.url,
        pa.price_after_discount::int as price
      FROM yarn y
      LEFT JOIN product_aggregated pa ON y.yarn_id = pa.yarn_id
      LEFT JOIN retailer r ON pa.retailer_id = r.retailer_id
      WHERE pa.retailer_id = $1 
        AND pa.name ILIKE $2
        AND pa.price_after_discount IS NOT NULL
      ORDER BY pa.price_after_discount ASC
    `, [retailer.retailer_id, `%${productName}%`]);

    if (apiResult.rows.length === 0) {
      console.log(`❌ No products would be returned by API (filtered by price_after_discount IS NOT NULL)`);
    } else {
      apiResult.rows.forEach((p, idx) => {
        console.log(`\n  API Result ${idx + 1}:`);
        console.log(`    Yarn: ${p.yarn_name} (ID: ${p.yarn_id})`);
        console.log(`    Retailer: ${p.retailer_name}`);
        console.log(`    Price: ${p.price} DKK`);
        console.log(`    URL: ${p.url}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

// Get command line arguments
// Usage: tsx temp-debug-scripts/debug-product-prices.ts [retailer] [product]
// Examples:
//   tsx temp-debug-scripts/debug-product-prices.ts kreamok.dk flora
//   tsx temp-debug-scripts/debug-product-prices.ts kreamok.dk "kid silk"
const retailerName = process.argv[2] || 'kreamok.dk';
const productName = process.argv[3] || 'flora';

console.log(`\n🔍 Product Price Debugger`);
console.log(`Retailer: ${retailerName}`);
console.log(`Product: ${productName}`);
console.log(`\nUsage: tsx temp-debug-scripts/debug-product-prices.ts [retailer] [product]`);
console.log(`Example: tsx temp-debug-scripts/debug-product-prices.ts kreamok.dk "drops flora"\n`);

debugProductPrices(retailerName, productName);

