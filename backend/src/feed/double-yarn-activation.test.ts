import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { pool } from '../db/index.js';

describe('Double Yarn Activation Logic', () => {
  let testRetailerId1: number;
  let testRetailerId2: number;
  let mainYarnId: number;
  let carryAlongYarnId: number;
  let doubleYarnId: number;

  before(async () => {
    // Set up test data: create retailers, single yarns, and a double yarn
    // Clean up any existing test data first
    await pool.query(`DELETE FROM yarn WHERE name LIKE 'TEST_%'`);
    await pool.query(`DELETE FROM retailer WHERE name LIKE 'TEST_%'`);

    // Create test retailers
    const retailer1Result = await pool.query(`
      INSERT INTO retailer (name, product_feed_url, banner_id, feed_id)
      VALUES ('TEST_Retailer1', 'https://test1.com/feed', 1, 1)
      ON CONFLICT (product_feed_url) DO UPDATE SET name = retailer.name
      RETURNING retailer_id
    `);
    testRetailerId1 = retailer1Result.rows[0].retailer_id;

    const retailer2Result = await pool.query(`
      INSERT INTO retailer (name, product_feed_url, banner_id, feed_id)
      VALUES ('TEST_Retailer2', 'https://test2.com/feed', 2, 2)
      ON CONFLICT (product_feed_url) DO UPDATE SET name = retailer.name
      RETURNING retailer_id
    `);
    testRetailerId2 = retailer2Result.rows[0].retailer_id;

    // Create test single yarns
    const mainYarnResult = await pool.query(`
      INSERT INTO yarn (name, yarn_type, search_query, is_active)
      VALUES ('TEST_MainYarn', 'single', 'main yarn', false)
      RETURNING yarn_id
    `);
    mainYarnId = mainYarnResult.rows[0].yarn_id;

    const carryYarnResult = await pool.query(`
      INSERT INTO yarn (name, yarn_type, search_query, is_active)
      VALUES ('TEST_CarryYarn', 'single', 'carry yarn', false)
      RETURNING yarn_id
    `);
    carryAlongYarnId = carryYarnResult.rows[0].yarn_id;

    // Create test double yarn
    const doubleYarnResult = await pool.query(`
      INSERT INTO yarn (name, yarn_type, main_yarn_id, carry_along_yarn_id, is_active)
      VALUES ('TEST_DoubleYarn', 'double', $1, $2, false)
      RETURNING yarn_id
    `, [mainYarnId, carryAlongYarnId]);
    doubleYarnId = doubleYarnResult.rows[0].yarn_id;
  });

  after(async () => {
    // Clean up test data
    await pool.query(`DELETE FROM product_aggregated WHERE yarn_id IN ($1, $2, $3)`, [mainYarnId, carryAlongYarnId, doubleYarnId]);
    await pool.query(`DELETE FROM product_imported WHERE retailer_id IN ($1, $2)`, [testRetailerId1, testRetailerId2]);
    await pool.query(`DELETE FROM yarn WHERE yarn_id IN ($1, $2, $3)`, [mainYarnId, carryAlongYarnId, doubleYarnId]);
    await pool.query(`DELETE FROM retailer WHERE retailer_id IN ($1, $2)`, [testRetailerId1, testRetailerId2]);
    await pool.end();
  });

  async function checkDoubleYarnActivation(): Promise<boolean> {
    // This replicates the logic from import.ts
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
    `, [mainYarnId, carryAlongYarnId]);

    return retailersWithBothResult.rows.length > 0;
  }

  async function updateDoubleYarnStatus(hasRetailer: boolean) {
    await pool.query(`
      UPDATE yarn
      SET 
        is_active = CASE WHEN $1 = TRUE THEN TRUE ELSE is_active END,
        active_since = CASE 
          WHEN $1 = TRUE AND active_since IS NULL THEN NOW() 
          ELSE active_since 
        END,
        inactive_since = CASE 
          WHEN $1 = FALSE AND is_active = FALSE AND inactive_since IS NULL THEN NOW() 
          ELSE inactive_since 
        END,
        updated_at = NOW()
      WHERE yarn_id = $2
    `, [hasRetailer, doubleYarnId]);
  }

  test('should activate double yarn when both component yarns are in stock at the same retailer', async () => {
    // Reset double yarn to inactive
    await pool.query(`UPDATE yarn SET is_active = false WHERE yarn_id = $1`, [doubleYarnId]);
    
    // Clean up any existing product entries
    await pool.query(`DELETE FROM product_aggregated WHERE yarn_id IN ($1, $2)`, [mainYarnId, carryAlongYarnId]);
    await pool.query(`DELETE FROM product_imported WHERE retailer_id = $1`, [testRetailerId1]);

    // Create product_imported entries first
    const mainProductResult = await pool.query(`
      INSERT INTO product_imported (
        retailer_id, retailers_product_id, brand, name, category,
        price_before_discount, price_after_discount, stock_status, url
      ) VALUES ($1, 'prod1', 'Test Brand', 'TEST_MainYarn Product', 'Garn', 50.00, 45.00, 'in stock', 'https://test1.com/main')
      RETURNING product_imported_id
    `, [testRetailerId1]);
    const mainProductId = mainProductResult.rows[0].product_imported_id;

    const carryProductResult = await pool.query(`
      INSERT INTO product_imported (
        retailer_id, retailers_product_id, brand, name, category,
        price_before_discount, price_after_discount, stock_status, url
      ) VALUES ($1, 'prod2', 'Test Brand', 'TEST_CarryYarn Product', 'Garn', 30.00, 25.00, 'in stock', 'https://test1.com/carry')
      RETURNING product_imported_id
    `, [testRetailerId1]);
    const carryProductId = carryProductResult.rows[0].product_imported_id;

    // Create product_aggregated entries for both yarns at the same retailer
    await pool.query(`
      INSERT INTO product_aggregated (
        product_imported_id, yarn_id, retailer_id, retailers_product_id, brand, name, category,
        price_before_discount, price_after_discount, stock_status, url
      ) VALUES
      ($1, $2, $3, 'prod1', 'Test Brand', 'TEST_MainYarn Product', 'Garn', 50.00, 45.00, 'in stock', 'https://test1.com/main'),
      ($4, $5, $3, 'prod2', 'Test Brand', 'TEST_CarryYarn Product', 'Garn', 30.00, 25.00, 'in stock', 'https://test1.com/carry')
    `, [mainProductId, mainYarnId, testRetailerId1, carryProductId, carryAlongYarnId]);

    // Check if retailers have both yarns
    const hasRetailer = await checkDoubleYarnActivation();
    assert.strictEqual(hasRetailer, true, 'Should find retailer with both yarns');

    // Update double yarn status
    await updateDoubleYarnStatus(hasRetailer);

    // Verify double yarn is active
    const result = await pool.query(`SELECT is_active FROM yarn WHERE yarn_id = $1`, [doubleYarnId]);
    assert.strictEqual(result.rows[0].is_active, true, 'Double yarn should be active when both component yarns are at same retailer');
  });

  test('should keep double yarn inactive when no retailer has both component yarns', async () => {
    // Reset double yarn to inactive
    await pool.query(`UPDATE yarn SET is_active = false WHERE yarn_id = $1`, [doubleYarnId]);
    
    // Clean up any existing product entries
    await pool.query(`DELETE FROM product_aggregated WHERE yarn_id IN ($1, $2)`, [mainYarnId, carryAlongYarnId]);
    await pool.query(`DELETE FROM product_imported WHERE retailer_id IN ($1, $2)`, [testRetailerId1, testRetailerId2]);

    // Create product_imported entries
    const mainProductResult = await pool.query(`
      INSERT INTO product_imported (
        retailer_id, retailers_product_id, brand, name, category,
        price_before_discount, price_after_discount, stock_status, url
      ) VALUES ($1, 'prod1', 'Test Brand', 'TEST_MainYarn Product', 'Garn', 50.00, 45.00, 'in stock', 'https://test1.com/main')
      RETURNING product_imported_id
    `, [testRetailerId1]);
    const mainProductId = mainProductResult.rows[0].product_imported_id;

    const carryProductResult = await pool.query(`
      INSERT INTO product_imported (
        retailer_id, retailers_product_id, brand, name, category,
        price_before_discount, price_after_discount, stock_status, url
      ) VALUES ($1, 'prod2', 'Test Brand', 'TEST_CarryYarn Product', 'Garn', 30.00, 25.00, 'in stock', 'https://test2.com/carry')
      RETURNING product_imported_id
    `, [testRetailerId2]);
    const carryProductId = carryProductResult.rows[0].product_imported_id;

    // Create product_aggregated entries for yarns at different retailers
    await pool.query(`
      INSERT INTO product_aggregated (
        product_imported_id, yarn_id, retailer_id, retailers_product_id, brand, name, category,
        price_before_discount, price_after_discount, stock_status, url
      ) VALUES
      ($1, $2, $3, 'prod1', 'Test Brand', 'TEST_MainYarn Product', 'Garn', 50.00, 45.00, 'in stock', 'https://test1.com/main')
    `, [mainProductId, mainYarnId, testRetailerId1]);

    await pool.query(`
      INSERT INTO product_aggregated (
        product_imported_id, yarn_id, retailer_id, retailers_product_id, brand, name, category,
        price_before_discount, price_after_discount, stock_status, url
      ) VALUES
      ($1, $2, $3, 'prod2', 'Test Brand', 'TEST_CarryYarn Product', 'Garn', 30.00, 25.00, 'in stock', 'https://test2.com/carry')
    `, [carryProductId, carryAlongYarnId, testRetailerId2]);

    // Check if retailers have both yarns
    const hasRetailer = await checkDoubleYarnActivation();
    assert.strictEqual(hasRetailer, false, 'Should not find retailer with both yarns');

    // Update double yarn status (should remain inactive)
    await updateDoubleYarnStatus(hasRetailer);

    // Verify double yarn is inactive
    const result = await pool.query(`SELECT is_active FROM yarn WHERE yarn_id = $1`, [doubleYarnId]);
    assert.strictEqual(result.rows[0].is_active, false, 'Double yarn should be inactive when component yarns are at different retailers');
  });

  test('should keep double yarn inactive when component yarns are in stock but at different retailers', async () => {
    // Reset double yarn to inactive
    await pool.query(`UPDATE yarn SET is_active = false WHERE yarn_id = $1`, [doubleYarnId]);
    
    // Clean up any existing product entries
    await pool.query(`DELETE FROM product_aggregated WHERE yarn_id IN ($1, $2)`, [mainYarnId, carryAlongYarnId]);
    await pool.query(`DELETE FROM product_imported WHERE retailer_id IN ($1, $2)`, [testRetailerId1, testRetailerId2]);
    
    // Create product_imported entries
    const mainProductResult = await pool.query(`
      INSERT INTO product_imported (
        retailer_id, retailers_product_id, brand, name, category,
        price_before_discount, price_after_discount, stock_status, url
      ) VALUES ($1, 'prod1', 'Test Brand', 'TEST_MainYarn Product', 'Garn', 50.00, 45.00, 'in stock', 'https://test1.com/main')
      RETURNING product_imported_id
    `, [testRetailerId1]);
    const mainProductId = mainProductResult.rows[0].product_imported_id;

    const carryProductResult = await pool.query(`
      INSERT INTO product_imported (
        retailer_id, retailers_product_id, brand, name, category,
        price_before_discount, price_after_discount, stock_status, url
      ) VALUES ($1, 'prod2', 'Test Brand', 'TEST_CarryYarn Product', 'Garn', 30.00, 25.00, 'in stock', 'https://test2.com/carry')
      RETURNING product_imported_id
    `, [testRetailerId2]);
    const carryProductId = carryProductResult.rows[0].product_imported_id;
    
    // Create: main yarn ONLY at retailer1, carry yarn ONLY at retailer2
    // No single retailer has both yarns
    await pool.query(`
      INSERT INTO product_aggregated (
        product_imported_id, yarn_id, retailer_id, retailers_product_id, brand, name, category,
        price_before_discount, price_after_discount, stock_status, url
      ) VALUES
      ($1, $2, $3, 'prod1', 'Test Brand', 'TEST_MainYarn Product', 'Garn', 50.00, 45.00, 'in stock', 'https://test1.com/main')
    `, [mainProductId, mainYarnId, testRetailerId1]);

    await pool.query(`
      INSERT INTO product_aggregated (
        product_imported_id, yarn_id, retailer_id, retailers_product_id, brand, name, category,
        price_before_discount, price_after_discount, stock_status, url
      ) VALUES
      ($1, $2, $3, 'prod2', 'Test Brand', 'TEST_CarryYarn Product', 'Garn', 30.00, 25.00, 'in stock', 'https://test2.com/carry')
    `, [carryProductId, carryAlongYarnId, testRetailerId2]);

    // Check if retailers have both yarns
    const hasRetailer = await checkDoubleYarnActivation();
    assert.strictEqual(hasRetailer, false, 'Should not find retailer with both yarns when they are at different retailers');

    // Update double yarn status
    await updateDoubleYarnStatus(hasRetailer);

    // Verify double yarn is inactive
    const result = await pool.query(`SELECT is_active FROM yarn WHERE yarn_id = $1`, [doubleYarnId]);
    assert.strictEqual(result.rows[0].is_active, false, 'Double yarn should be inactive when component yarns are at different retailers');
  });

  test('should keep double yarn inactive when one component yarn is out of stock even if both are at same retailer', async () => {
    // Reset double yarn to inactive
    await pool.query(`UPDATE yarn SET is_active = false WHERE yarn_id = $1`, [doubleYarnId]);
    
    // Clean up any existing product entries
    await pool.query(`DELETE FROM product_aggregated WHERE yarn_id IN ($1, $2)`, [mainYarnId, carryAlongYarnId]);
    await pool.query(`DELETE FROM product_imported WHERE retailer_id = $1`, [testRetailerId1]);

    // Create product_imported entries
    const mainProductResult = await pool.query(`
      INSERT INTO product_imported (
        retailer_id, retailers_product_id, brand, name, category,
        price_before_discount, price_after_discount, stock_status, url
      ) VALUES ($1, 'prod1', 'Test Brand', 'TEST_MainYarn Product', 'Garn', 50.00, 45.00, 'in stock', 'https://test1.com/main')
      RETURNING product_imported_id
    `, [testRetailerId1]);
    const mainProductId = mainProductResult.rows[0].product_imported_id;

    const carryProductResult = await pool.query(`
      INSERT INTO product_imported (
        retailer_id, retailers_product_id, brand, name, category,
        price_before_discount, price_after_discount, stock_status, url
      ) VALUES ($1, 'prod2', 'Test Brand', 'TEST_CarryYarn Product', 'Garn', 30.00, 25.00, 'out of stock', 'https://test1.com/carry')
      RETURNING product_imported_id
    `, [testRetailerId1]);
    const carryProductId = carryProductResult.rows[0].product_imported_id;

    // Create product_aggregated entries: both yarns at same retailer, but one is out of stock
    await pool.query(`
      INSERT INTO product_aggregated (
        product_imported_id, yarn_id, retailer_id, retailers_product_id, brand, name, category,
        price_before_discount, price_after_discount, stock_status, url
      ) VALUES
      ($1, $2, $3, 'prod1', 'Test Brand', 'TEST_MainYarn Product', 'Garn', 50.00, 45.00, 'in stock', 'https://test1.com/main'),
      ($4, $5, $3, 'prod2', 'Test Brand', 'TEST_CarryYarn Product', 'Garn', 30.00, 25.00, 'out of stock', 'https://test1.com/carry')
    `, [mainProductId, mainYarnId, testRetailerId1, carryProductId, carryAlongYarnId]);

    // Check if retailers have both yarns (both must be 'in stock')
    const hasRetailer = await checkDoubleYarnActivation();
    assert.strictEqual(hasRetailer, false, 'Should not find retailer with both yarns in stock when one is out of stock');

    // Update double yarn status
    await updateDoubleYarnStatus(hasRetailer);

    // Verify double yarn is inactive
    const result = await pool.query(`SELECT is_active FROM yarn WHERE yarn_id = $1`, [doubleYarnId]);
    assert.strictEqual(result.rows[0].is_active, false, 'Double yarn should be inactive when one component yarn is out of stock');
  });

  test('should activate double yarn when multiple retailers have both component yarns', async () => {
    // Reset double yarn to inactive
    await pool.query(`UPDATE yarn SET is_active = false WHERE yarn_id = $1`, [doubleYarnId]);
    
    // Clean up any existing product entries
    await pool.query(`DELETE FROM product_aggregated WHERE yarn_id IN ($1, $2)`, [mainYarnId, carryAlongYarnId]);
    await pool.query(`DELETE FROM product_imported WHERE retailer_id IN ($1, $2)`, [testRetailerId1, testRetailerId2]);

    // Create product_imported entries for retailer1
    const main1Result = await pool.query(`
      INSERT INTO product_imported (
        retailer_id, retailers_product_id, brand, name, category,
        price_before_discount, price_after_discount, stock_status, url
      ) VALUES ($1, 'prod1', 'Test Brand', 'TEST_MainYarn Product', 'Garn', 50.00, 45.00, 'in stock', 'https://test1.com/main')
      RETURNING product_imported_id
    `, [testRetailerId1]);
    const main1Id = main1Result.rows[0].product_imported_id;

    const carry1Result = await pool.query(`
      INSERT INTO product_imported (
        retailer_id, retailers_product_id, brand, name, category,
        price_before_discount, price_after_discount, stock_status, url
      ) VALUES ($1, 'prod2', 'Test Brand', 'TEST_CarryYarn Product', 'Garn', 30.00, 25.00, 'in stock', 'https://test1.com/carry')
      RETURNING product_imported_id
    `, [testRetailerId1]);
    const carry1Id = carry1Result.rows[0].product_imported_id;

    // Create product_imported entries for retailer2
    const main2Result = await pool.query(`
      INSERT INTO product_imported (
        retailer_id, retailers_product_id, brand, name, category,
        price_before_discount, price_after_discount, stock_status, url
      ) VALUES ($1, 'prod3', 'Test Brand', 'TEST_MainYarn Product', 'Garn', 55.00, 50.00, 'in stock', 'https://test2.com/main')
      RETURNING product_imported_id
    `, [testRetailerId2]);
    const main2Id = main2Result.rows[0].product_imported_id;

    const carry2Result = await pool.query(`
      INSERT INTO product_imported (
        retailer_id, retailers_product_id, brand, name, category,
        price_before_discount, price_after_discount, stock_status, url
      ) VALUES ($1, 'prod4', 'Test Brand', 'TEST_CarryYarn Product', 'Garn', 35.00, 30.00, 'in stock', 'https://test2.com/carry')
      RETURNING product_imported_id
    `, [testRetailerId2]);
    const carry2Id = carry2Result.rows[0].product_imported_id;

    // Create product_aggregated entries: both yarns available at both retailers
    await pool.query(`
      INSERT INTO product_aggregated (
        product_imported_id, yarn_id, retailer_id, retailers_product_id, brand, name, category,
        price_before_discount, price_after_discount, stock_status, url
      ) VALUES
      ($1, $2, $3, 'prod1', 'Test Brand', 'TEST_MainYarn Product', 'Garn', 50.00, 45.00, 'in stock', 'https://test1.com/main'),
      ($4, $5, $3, 'prod2', 'Test Brand', 'TEST_CarryYarn Product', 'Garn', 30.00, 25.00, 'in stock', 'https://test1.com/carry'),
      ($6, $2, $7, 'prod3', 'Test Brand', 'TEST_MainYarn Product', 'Garn', 55.00, 50.00, 'in stock', 'https://test2.com/main'),
      ($8, $5, $7, 'prod4', 'Test Brand', 'TEST_CarryYarn Product', 'Garn', 35.00, 30.00, 'in stock', 'https://test2.com/carry')
    `, [main1Id, mainYarnId, testRetailerId1, carry1Id, carryAlongYarnId, main2Id, testRetailerId2, carry2Id]);

    // Check if retailers have both yarns
    const hasRetailer = await checkDoubleYarnActivation();
    assert.strictEqual(hasRetailer, true, 'Should find retailers with both yarns when multiple retailers have both');

    // Update double yarn status
    await updateDoubleYarnStatus(hasRetailer);

    // Verify double yarn is active
    const result = await pool.query(`SELECT is_active FROM yarn WHERE yarn_id = $1`, [doubleYarnId]);
    assert.strictEqual(result.rows[0].is_active, true, 'Double yarn should be active when multiple retailers have both component yarns');
  });
});

