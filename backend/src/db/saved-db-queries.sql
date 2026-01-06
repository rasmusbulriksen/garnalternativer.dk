-- ts vector example
SELECT product_id, retailer_id, brand, name, category, price_after_discount, url,
       ts_rank_cd(search_tsv, websearch_to_tsquery('drops alpaca')) AS rank,
       similarity(name, 'drops alpaca') AS sim
FROM product
WHERE (
  search_tsv @@ websearch_to_tsquery('drops alpaca')
  OR similarity(name, 'drops alpaca') > 0.25
)
AND NOT (name ILIKE ANY (ARRAY['%boucl%', '%brushed%', '%silk%']))
ORDER BY sim DESC, rank DESC;

-- Simple search with negative keywords
SELECT *
FROM product
WHERE lower(name) ILIKE lower('%drops alpaca%')
  AND NOT (name ILIKE ANY (ARRAY['%boucl%', '%brushed%', '%silk%']))
ORDER BY price_after_discount;

-- Insert a yarn
insert into yarn (
    name,
    description,
    image_url,
    tension,
    skein_length,
    lowest_price_on_the_market,
    price_per_meter,
    is_active,
    search_query,
    negative_keywords,
    created_at,
    updated_at
) values (
    'Drops Soft Tweed',
    'Drops Soft Tweed description',
    'https://test.com',
    21,
    200,
    22.95,
    0.087,
    true,
    'soft tweed',
    ARRAY['lana', 'grossa'],
    now(),
    now()
);

update yarn set search_query = 'sunday' where yarn_id = 6;

delete from yarn where yarn_id = 15;

truncate table product_aggregated;

select * from yarn;

select * from product_aggregated where yarn_id = 16;

select * from retailer;

-- Remove % wildcards from negative_keywords arrays
-- This updates all negative_keywords to remove leading and trailing % characters
-- Also removes empty strings from arrays
UPDATE yarn y
SET negative_keywords = (
  SELECT COALESCE(array_agg(trimmed_kw), ARRAY[]::text[])
  FROM (
    SELECT trim(both '%' from kw) as trimmed_kw
    FROM unnest(y.negative_keywords) AS kw
    WHERE trim(both '%' from kw) != ''
  ) AS keywords
),
updated_at = NOW()
WHERE y.negative_keywords IS NOT NULL 
  AND array_length(y.negative_keywords, 1) > 0;

-- Debug: Check product prices for a specific retailer and product
-- Example: Check Drops Flora from kreamok.dk
SELECT 
  pi.product_imported_id,
  pi.retailers_product_id,
  pi.brand,
  pi.name,
  pi.price_before_discount,
  pi.price_after_discount,
  pi.stock_status,
  pi.url,
  r.name as retailer_name
FROM product_imported pi
JOIN retailer r ON pi.retailer_id = r.retailer_id
WHERE r.name ILIKE '%kreamok%'
  AND pi.name ILIKE '%flora%'
ORDER BY pi.price_after_discount ASC NULLS LAST;

-- Debug: Check aggregated products for a specific retailer and product
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
  r.name as retailer_name
FROM product_aggregated pa
JOIN retailer r ON pa.retailer_id = r.retailer_id
LEFT JOIN yarn y ON pa.yarn_id = y.yarn_id
WHERE r.name ILIKE '%kreamok%'
  AND pa.name ILIKE '%flora%'
ORDER BY pa.price_after_discount ASC NULLS LAST;

-- Debug: Check what the API would return for a specific product
SELECT 
  y.yarn_id,
  y.name as yarn_name,
  r.name as retailer_name,
  pa.url,
  pa.price_after_discount::int as price,
  pa.price_before_discount::int as original_price
FROM yarn y
LEFT JOIN product_aggregated pa ON y.yarn_id = pa.yarn_id
LEFT JOIN retailer r ON pa.retailer_id = r.retailer_id
WHERE r.name ILIKE '%kreamok%'
  AND pa.name ILIKE '%flora%'
  AND pa.price_after_discount IS NOT NULL
ORDER BY pa.price_after_discount ASC;

-- Debug: Check all products from a retailer with NULL price_after_discount
SELECT 
  pi.product_imported_id,
  pi.name,
  pi.price_before_discount,
  pi.price_after_discount,
  r.name as retailer_name
FROM product_imported pi
JOIN retailer r ON pi.retailer_id = r.retailer_id
WHERE r.name ILIKE '%kreamok%'
  AND pi.price_after_discount IS NULL
  AND pi.price_before_discount IS NOT NULL
ORDER BY pi.name;