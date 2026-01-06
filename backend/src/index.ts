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

// Get all yarns (simple list for admin dropdowns)
app.get('/yarns/all', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT yarn_id, name, yarn_type
      FROM yarn
      WHERE is_active = TRUE AND yarn_type = 'single'
      ORDER BY name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching all yarns:', error);
    res.status(500).json({ error: 'Failed to fetch yarns' });
  }
});

// Create a new yarn
app.post('/yarns', async (req, res) => {
  try {
    const {
      name,
      description,
      image_url,
      tension,
      skein_length,
      lowest_price_on_the_market,
      price_per_meter,
      yarn_type,
      main_yarn_id,
      carry_along_yarn_id,
      is_active,
      search_query,
      negative_keywords
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (yarn_type === 'double') {
      if (!main_yarn_id || !carry_along_yarn_id) {
        return res.status(400).json({ error: 'main_yarn_id and carry_along_yarn_id are required for double yarns' });
      }
      if (main_yarn_id === carry_along_yarn_id) {
        return res.status(400).json({ error: 'main_yarn_id and carry_along_yarn_id must be different' });
      }
    }

    const result = await pool.query(`
      INSERT INTO yarn (
        name,
        description,
        image_url,
        tension,
        skein_length,
        lowest_price_on_the_market,
        price_per_meter,
        yarn_type,
        main_yarn_id,
        carry_along_yarn_id,
        is_active,
        search_query,
        negative_keywords,
        active_since
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CASE WHEN $11 = TRUE THEN NOW() ELSE NULL END)
      RETURNING yarn_id, name, yarn_type, created_at
    `, [
      name,
      description || null,
      image_url || null,
      tension || null,
      skein_length || null,
      lowest_price_on_the_market || null,
      price_per_meter || null,
      yarn_type || 'single',
      yarn_type === 'double' ? main_yarn_id : null,
      yarn_type === 'double' ? carry_along_yarn_id : null,
      is_active !== undefined ? is_active : true,
      search_query || null,
      negative_keywords && Array.isArray(negative_keywords) ? negative_keywords : null
    ]);

    res.status(201).json({
      success: true,
      yarn: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error creating yarn:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'A yarn with this name already exists' });
    }
    if (error.code === '23503') {
      return res.status(400).json({ error: 'Invalid yarn_id reference for main_yarn_id or carry_along_yarn_id' });
    }
    res.status(500).json({ error: 'Failed to create yarn', details: error.message });
  }
});

// Update a yarn
app.put('/yarns/:id', async (req, res) => {
  try {
    const yarnId = parseInt(req.params.id);
    if (isNaN(yarnId)) {
      return res.status(400).json({ error: 'Invalid yarn ID' });
    }

    const {
      name,
      description,
      image_url,
      tension,
      skein_length,
      lowest_price_on_the_market,
      price_per_meter,
      main_yarn_id,
      carry_along_yarn_id,
      is_active,
      search_query,
      negative_keywords
    } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description || null);
    }
    if (image_url !== undefined) {
      updates.push(`image_url = $${paramCount++}`);
      values.push(image_url || null);
    }
    if (tension !== undefined) {
      updates.push(`tension = $${paramCount++}`);
      values.push(tension ? parseInt(tension) : null);
    }
    if (skein_length !== undefined) {
      updates.push(`skein_length = $${paramCount++}`);
      values.push(skein_length ? parseInt(skein_length) : null);
    }
    if (lowest_price_on_the_market !== undefined) {
      updates.push(`lowest_price_on_the_market = $${paramCount++}`);
      values.push(lowest_price_on_the_market ? parseInt(lowest_price_on_the_market) : null);
    }
    if (price_per_meter !== undefined) {
      updates.push(`price_per_meter = $${paramCount++}`);
      values.push(price_per_meter ? parseFloat(price_per_meter) : null);
    }
    if (main_yarn_id !== undefined) {
      updates.push(`main_yarn_id = $${paramCount++}`);
      values.push(main_yarn_id ? parseInt(main_yarn_id) : null);
    }
    if (carry_along_yarn_id !== undefined) {
      updates.push(`carry_along_yarn_id = $${paramCount++}`);
      values.push(carry_along_yarn_id ? parseInt(carry_along_yarn_id) : null);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
      if (is_active) {
        updates.push(`active_since = CASE WHEN active_since IS NULL THEN NOW() ELSE active_since END`);
      } else {
        updates.push(`inactive_since = CASE WHEN inactive_since IS NULL THEN NOW() ELSE inactive_since END`);
      }
    }
    if (search_query !== undefined) {
      updates.push(`search_query = $${paramCount++}`);
      values.push(search_query || null);
    }
    if (negative_keywords !== undefined) {
      updates.push(`negative_keywords = $${paramCount++}`);
      values.push(negative_keywords && Array.isArray(negative_keywords) ? negative_keywords : null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(yarnId);

    const result = await pool.query(`
      UPDATE yarn 
      SET ${updates.join(', ')}
      WHERE yarn_id = $${paramCount}
      RETURNING yarn_id, name, yarn_type, is_active, updated_at
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Yarn not found' });
    }

    res.json({
      success: true,
      yarn: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error updating yarn:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'A yarn with this name already exists' });
    }
    if (error.code === '23503') {
      return res.status(400).json({ error: 'Invalid yarn_id reference for main_yarn_id or carry_along_yarn_id' });
    }
    res.status(500).json({ error: 'Failed to update yarn', details: error.message });
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

        const combinedOffers: Array<{
          retailer: { name: string };
          mainYarn: { productUrl: string; price: number };
          carryAlongYarn: { productUrl: string; price: number };
          combinedPrice: number;
        }> = [];
        const retailerNames = new Set([...mainRetailers.keys(), ...carryRetailers.keys()]);

        retailerNames.forEach((retailerName) => {
          const main = mainRetailers.get(retailerName);
          const carry = carryRetailers.get(retailerName);
          
          // Only include retailers where both component yarns are available
          if (main && carry) {
            combinedOffers.push({
              retailer: { name: retailerName },
              mainYarn: {
                productUrl: main.url,
                price: main.price
              },
              carryAlongYarn: {
                productUrl: carry.url,
                price: carry.price
              },
              combinedPrice: main.price + carry.price
            });
          }
        });

        // Sort by combined price
        combinedOffers.sort((a, b) => a.combinedPrice - b.combinedPrice);

        return {
          ...doubleYarn,
          offers: combinedOffers,
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
      
      // Transform retailers to SingleYarnOffer format
      const offers = (row.retailers && row.retailers.length > 0 
        ? row.retailers.filter((r: any) => r.name && r.price)
        : []
      ).map((r: any) => ({
        retailer: { name: r.name },
        productUrl: r.url,
        price: r.price
      }));
      
      return {
        id: id,
        type: 'single' as const,
        name: row.name,
        image: imagePath,
        tension: row.tension,
        skeinLength: row.skein_length,
        offers: offers,
        url: offers.length > 0 ? offers[0].productUrl : '#'
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
        offers: row.offers || []
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

