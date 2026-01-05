import express from 'express';
import cors from 'cors';
import { pool } from './db/index.js';

const app = express();
// Use port 3001 by default to avoid conflict with Next.js frontend (which uses 3000)
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

// Get all products
app.get('/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products LIMIT 100');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get products by retailer
app.get('/products/retailer/:retailer', async (req, res) => {
  try {
    const { retailer } = req.params;
    const result = await pool.query(
      'SELECT * FROM products WHERE forhandler ILIKE $1 LIMIT 100',
      [`%${retailer}%`]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get all yarns with retailers and pricing
app.get('/yarns', async (req, res) => {
  try {
    // Query single yarns with their retailers from product_aggregated
    const singleYarnsResult = await pool.query(`
      SELECT 
        y.yarn_id,
        y.name,
        y.image_url,
        y.tension,
        y.skein_length,
        y.lowest_price_on_the_market,
        y.price_per_meter,
        y.yarn_type,
        y.main_yarn_id,
        y.carry_along_yarn_id,
        COALESCE(
          json_agg(
            json_build_object(
              'name', r.name,
              'url', pa.url,
              'price', pa.price_after_discount::int
            ) ORDER BY pa.price_after_discount ASC
          ) FILTER (WHERE pa.price_after_discount IS NOT NULL AND r.name IS NOT NULL),
          '[]'::json
        ) as retailers
      FROM yarn y
      LEFT JOIN product_aggregated pa ON y.yarn_id = pa.yarn_id
      LEFT JOIN retailer r ON pa.retailer_id = r.retailer_id
      WHERE y.is_active = TRUE AND y.yarn_type = 'single'
      GROUP BY y.yarn_id, y.name, y.image_url, y.tension, y.skein_length, y.lowest_price_on_the_market, y.price_per_meter, y.yarn_type, y.main_yarn_id, y.carry_along_yarn_id
      ORDER BY y.name
    `);

    // Query double yarns and combine retailers from component yarns
    const doubleYarnsResult = await pool.query(`
      SELECT 
        y.yarn_id,
        y.name,
        y.image_url,
        y.tension,
        y.skein_length,
        y.lowest_price_on_the_market,
        y.price_per_meter,
        y.yarn_type,
        y.main_yarn_id,
        y.carry_along_yarn_id,
        main_yarn.yarn_id as main_yarn_db_id,
        carry_yarn.yarn_id as carry_yarn_db_id
      FROM yarn y
      JOIN yarn main_yarn ON y.main_yarn_id = main_yarn.yarn_id
      JOIN yarn carry_yarn ON y.carry_along_yarn_id = carry_yarn.yarn_id
      WHERE y.is_active = TRUE AND y.yarn_type = 'double'
      ORDER BY y.name
    `);

    // Get all yarn names for ID generation
    const allYarnNamesResult = await pool.query('SELECT yarn_id, name FROM yarn');
    const yarnIdToName = new Map(
      allYarnNamesResult.rows.map((r: any) => [r.yarn_id, r.name])
    );

    // For each double yarn, combine retailers from main and carry-along yarns
    const doubleYarnsWithRetailers = await Promise.all(
      doubleYarnsResult.rows.map(async (doubleYarn) => {
        // Get retailers for main yarn
        const mainRetailersResult = await pool.query(`
          SELECT 
            r.name,
            pa.url,
            pa.price_after_discount::int as price
          FROM product_aggregated pa
          JOIN retailer r ON pa.retailer_id = r.retailer_id
          WHERE pa.yarn_id = $1 AND pa.price_after_discount IS NOT NULL
          ORDER BY pa.price_after_discount ASC
        `, [doubleYarn.main_yarn_id]);

        // Get retailers for carry-along yarn
        const carryRetailersResult = await pool.query(`
          SELECT 
            r.name,
            pa.url,
            pa.price_after_discount::int as price
          FROM product_aggregated pa
          JOIN retailer r ON pa.retailer_id = r.retailer_id
          WHERE pa.yarn_id = $1 AND pa.price_after_discount IS NOT NULL
          ORDER BY pa.price_after_discount ASC
        `, [doubleYarn.carry_along_yarn_id]);

        // Combine retailers: for each retailer that has both yarns, sum the prices
        const mainRetailers = new Map(
          mainRetailersResult.rows.map((r: any) => [r.name, { url: r.url, price: r.price }])
        );
        const carryRetailers = new Map(
          carryRetailersResult.rows.map((r: any) => [r.name, { url: r.url, price: r.price }])
        );

        const combinedRetailers: Array<{ name: string; url: string; price: number }> = [];
        const retailerNames = new Set([...mainRetailers.keys(), ...carryRetailers.keys()]);

        retailerNames.forEach((retailerName) => {
          const main = mainRetailers.get(retailerName);
          const carry = carryRetailers.get(retailerName);
          
          // Only include retailers where both component yarns are available
          if (main && carry) {
            combinedRetailers.push({
              name: retailerName,
              url: main.url, // Use main yarn's URL
              price: main.price + carry.price
            });
          }
        });

        // Sort by combined price
        combinedRetailers.sort((a, b) => a.price - b.price);

        return {
          ...doubleYarn,
          retailers: combinedRetailers,
          mainYarnName: yarnIdToName.get(doubleYarn.main_yarn_id) || '',
          carryYarnName: yarnIdToName.get(doubleYarn.carry_along_yarn_id) || ''
        };
      })
    );

    // Placeholder image for all yarns (until proper images are configured)
    const PLACEHOLDER_IMAGE = '/yarns/sandnes/single/sandnes-sunday.webp';
    
    // Transform single yarns to match frontend format
    const singleYarns = singleYarnsResult.rows.map((row) => {
      const id = row.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      let imagePath = PLACEHOLDER_IMAGE;
      if (row.image_url && row.image_url.startsWith('/')) {
        imagePath = row.image_url;
      }
      
      return {
        id: id,
        type: 'single' as const,
        name: row.name,
        image: imagePath,
        tension: row.tension,
        skeinLength: row.skein_length,
        retailers: row.retailers && row.retailers.length > 0 
          ? row.retailers.filter((r: any) => r.name && r.price) 
          : [],
        dummyUrl: row.retailers && row.retailers.length > 0 
          ? row.retailers[0].url 
          : '#'
      };
    });

    // Transform double yarns to match frontend format
    const doubleYarns = doubleYarnsWithRetailers.map((row) => {
      const id = row.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      // Generate IDs for main and carry-along yarns from their names
      const mainYarnId = row.mainYarnName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const carryYarnId = row.carryYarnName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      let imagePath = PLACEHOLDER_IMAGE;
      if (row.image_url && row.image_url.startsWith('/')) {
        imagePath = row.image_url;
      }
      
      return {
        id: id,
        type: 'double' as const,
        name: row.name,
        image: imagePath,
        tension: row.tension,
        mainYarnId: mainYarnId,
        carryAlongYarnId: carryYarnId,
        retailers: row.retailers || [],
        dummyUrl: row.retailers && row.retailers.length > 0 
          ? row.retailers[0].url 
          : '#'
      };
    });

    // Combine and return all yarns
    res.json([...singleYarns, ...doubleYarns]);
  } catch (error) {
    console.error('Error fetching yarns:', error);
    res.status(500).json({ error: 'Failed to fetch yarns' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 ProductFeedAPI running on http://localhost:${PORT}`);
});

