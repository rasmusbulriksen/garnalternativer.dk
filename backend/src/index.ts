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
    // Query yarns with their retailers from product_aggregated
    const result = await pool.query(`
      SELECT 
        y.yarn_id,
        y.name,
        y.image_url,
        y.tension,
        y.skein_length,
        y.lowest_price_on_the_market,
        y.price_per_meter,
        y.is_active,
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
      WHERE y.is_active = TRUE
      GROUP BY y.yarn_id, y.name, y.image_url, y.tension, y.skein_length, y.lowest_price_on_the_market, y.price_per_meter, y.is_active
      ORDER BY y.name
    `);

    // Placeholder image for all yarns (until proper images are configured)
    const PLACEHOLDER_IMAGE = '/yarns/sandnes/single/sandnes-sunday.webp';
    
    // Transform to match frontend format
    const yarns = result.rows.map((row) => {
      // Generate ID from name (lowercase, replace spaces with hyphens)
      const id = row.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      // Use placeholder image if image_url is not set or is an external URL
      // Only use image_url if it's a local path (starts with /)
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

    res.json(yarns);
  } catch (error) {
    console.error('Error fetching yarns:', error);
    res.status(500).json({ error: 'Failed to fetch yarns' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 ProductFeedAPI running on http://localhost:${PORT}`);
});

