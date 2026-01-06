import { pool } from '../src/db/index.js';
import { isInStock } from '../src/feed/stock-status.js';

/**
 * Debug script to check why a double yarn isn't activating
 * Usage: tsx backend/temp-debug-scripts/debug-double-yarn-activation.ts <double_yarn_id>
 */

async function debugDoubleYarnActivation(doubleYarnId: number) {
  console.log(`🔍 Debugging double yarn activation for yarn_id: ${doubleYarnId}\n`);

  try {
    // Get double yarn info
    const doubleYarnResult = await pool.query(`
      SELECT 
        yarn_id,
        name,
        main_yarn_id,
        carry_along_yarn_id,
        is_active
      FROM yarn
      WHERE yarn_id = $1
    `, [doubleYarnId]);

    if (doubleYarnResult.rows.length === 0) {
      console.error(`❌ Double yarn with ID ${doubleYarnId} not found`);
      process.exit(1);
    }

    const doubleYarn = doubleYarnResult.rows[0];
    console.log(`📋 Double Yarn Info:`);
    console.log(`   Name: ${doubleYarn.name}`);
    console.log(`   Main Yarn ID: ${doubleYarn.main_yarn_id}`);
    console.log(`   Carry Along Yarn ID: ${doubleYarn.carry_along_yarn_id}`);
    console.log(`   Currently Active: ${doubleYarn.is_active}\n`);

    // Get component yarn info
    const mainYarnResult = await pool.query(`
      SELECT yarn_id, name, is_active, search_query, expanded_search_query
      FROM yarn WHERE yarn_id = $1
    `, [doubleYarn.main_yarn_id]);

    const carryYarnResult = await pool.query(`
      SELECT yarn_id, name, is_active, search_query, expanded_search_query
      FROM yarn WHERE yarn_id = $1
    `, [doubleYarn.carry_along_yarn_id]);

    const mainYarn = mainYarnResult.rows[0];
    const carryYarn = carryYarnResult.rows[0];

    console.log(`📋 Component Yarns:`);
    console.log(`   Main Yarn (${mainYarn.yarn_id}): ${mainYarn.name}`);
    console.log(`      Active: ${mainYarn.is_active}`);
    console.log(`      Search Query: ${mainYarn.search_query || 'NULL'}`);
    console.log(`      Expanded Search Query: ${mainYarn.expanded_search_query || 'NULL'}`);
    console.log(`   Carry Yarn (${carryYarn.yarn_id}): ${carryYarn.name}`);
    console.log(`      Active: ${carryYarn.is_active}`);
    console.log(`      Search Query: ${carryYarn.search_query || 'NULL'}`);
    console.log(`      Expanded Search Query: ${carryYarn.expanded_search_query || 'NULL'}\n`);

    // Check product_aggregated entries for main yarn
    const mainProductsResult = await pool.query(`
      SELECT 
        pa.product_aggregated_id,
        pa.retailer_id,
        r.name as retailer_name,
        pa.name as product_name,
        pa.stock_status,
        pa.price_after_discount
      FROM product_aggregated pa
      LEFT JOIN retailer r ON pa.retailer_id = r.retailer_id
      WHERE pa.yarn_id = $1
      ORDER BY r.name, pa.price_after_discount
    `, [doubleYarn.main_yarn_id]);

    console.log(`📦 Main Yarn Products (${mainProductsResult.rows.length} retailers):`);
    if (mainProductsResult.rows.length === 0) {
      console.log(`   ⚠️  No products found for main yarn!`);
    } else {
      mainProductsResult.rows.forEach((row, idx) => {
        const inStock = isInStock(row.stock_status);
        console.log(`   ${idx + 1}. ${row.retailer_name || `Retailer ${row.retailer_id}`}:`);
        console.log(`      Product: ${row.product_name}`);
        console.log(`      Stock Status: "${row.stock_status}" → ${inStock ? '✅ IN STOCK' : '❌ OUT OF STOCK'}`);
        console.log(`      Price: ${row.price_after_discount}`);
      });
    }
    console.log('');

    // Check product_aggregated entries for carry yarn
    const carryProductsResult = await pool.query(`
      SELECT 
        pa.product_aggregated_id,
        pa.retailer_id,
        r.name as retailer_name,
        pa.name as product_name,
        pa.stock_status,
        pa.price_after_discount
      FROM product_aggregated pa
      LEFT JOIN retailer r ON pa.retailer_id = r.retailer_id
      WHERE pa.yarn_id = $1
      ORDER BY r.name, pa.price_after_discount
    `, [doubleYarn.carry_along_yarn_id]);

    console.log(`📦 Carry Yarn Products (${carryProductsResult.rows.length} retailers):`);
    if (carryProductsResult.rows.length === 0) {
      console.log(`   ⚠️  No products found for carry yarn!`);
    } else {
      carryProductsResult.rows.forEach((row, idx) => {
        const inStock = isInStock(row.stock_status);
        console.log(`   ${idx + 1}. ${row.retailer_name || `Retailer ${row.retailer_id}`}:`);
        console.log(`      Product: ${row.product_name}`);
        console.log(`      Stock Status: "${row.stock_status}" → ${inStock ? '✅ IN STOCK' : '❌ OUT OF STOCK'}`);
        console.log(`      Price: ${row.price_after_discount}`);
      });
    }
    console.log('');

    // Check for retailers with both yarns
    const retailersWithBothResult = await pool.query(`
      SELECT 
        main_pa.retailer_id,
        r.name as retailer_name,
        main_pa.stock_status as main_stock_status,
        carry_pa.stock_status as carry_stock_status,
        main_pa.price_after_discount::numeric as main_price,
        carry_pa.price_after_discount::numeric as carry_price,
        (main_pa.price_after_discount::numeric + carry_pa.price_after_discount::numeric)::int as combined_price
      FROM product_aggregated main_pa
      INNER JOIN product_aggregated carry_pa ON main_pa.retailer_id = carry_pa.retailer_id
      LEFT JOIN retailer r ON main_pa.retailer_id = r.retailer_id
      WHERE main_pa.yarn_id = $1
        AND carry_pa.yarn_id = $2
        AND main_pa.price_after_discount IS NOT NULL
        AND carry_pa.price_after_discount IS NOT NULL
      ORDER BY combined_price ASC
    `, [doubleYarn.main_yarn_id, doubleYarn.carry_along_yarn_id]);

    console.log(`🔗 Retailers with Both Yarns (${retailersWithBothResult.rows.length} matches):`);
    if (retailersWithBothResult.rows.length === 0) {
      console.log(`   ⚠️  No retailers have both yarns!`);
    } else {
      retailersWithBothResult.rows.forEach((row, idx) => {
        const mainInStock = isInStock(row.main_stock_status);
        const carryInStock = isInStock(row.carry_stock_status);
        const bothInStock = mainInStock && carryInStock;
        
        console.log(`   ${idx + 1}. ${row.retailer_name || `Retailer ${row.retailer_id}`}:`);
        console.log(`      Main: "${row.main_stock_status}" → ${mainInStock ? '✅' : '❌'}`);
        console.log(`      Carry: "${row.carry_stock_status}" → ${carryInStock ? '✅' : '❌'}`);
        console.log(`      Combined Price: ${row.combined_price}`);
        console.log(`      ${bothInStock ? '✅ BOTH IN STOCK' : '❌ NOT BOTH IN STOCK'}`);
      });
    }
    console.log('');

    // Final check
    const retailersWithBothInStock = retailersWithBothResult.rows.filter(row => 
      isInStock(row.main_stock_status) && isInStock(row.carry_stock_status)
    );

    console.log(`📊 Summary:`);
    console.log(`   Retailers with both yarns: ${retailersWithBothResult.rows.length}`);
    console.log(`   Retailers with both IN STOCK: ${retailersWithBothInStock.length}`);
    console.log(`   Should be active: ${retailersWithBothInStock.length > 0 ? '✅ YES' : '❌ NO'}`);
    console.log(`   Currently active: ${doubleYarn.is_active ? '✅ YES' : '❌ NO'}`);

    if (retailersWithBothInStock.length > 0 && !doubleYarn.is_active) {
      console.log(`\n⚠️  ISSUE FOUND: Double yarn should be active but isn't!`);
      console.log(`   Run the import script to update activation status.`);
    } else if (retailersWithBothInStock.length === 0 && doubleYarn.is_active) {
      console.log(`\n⚠️  ISSUE FOUND: Double yarn is active but shouldn't be!`);
    } else if (retailersWithBothInStock.length === 0) {
      console.log(`\n💡 DIAGNOSIS: No retailers have both yarns in stock.`);
      console.log(`   Check if:`);
      console.log(`   1. Products are matching the yarn search queries`);
      console.log(`   2. Stock status values are being recognized correctly`);
      console.log(`   3. Both yarns have product_aggregated entries`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

const doubleYarnId = process.argv[2];
if (!doubleYarnId) {
  console.error('Usage: tsx backend/temp-debug-scripts/debug-double-yarn-activation.ts <double_yarn_id>');
  process.exit(1);
}

debugDoubleYarnActivation(parseInt(doubleYarnId, 10));
