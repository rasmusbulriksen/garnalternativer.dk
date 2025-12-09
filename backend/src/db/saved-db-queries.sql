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
    'Drops Alpaca',
    'Drops Alpaca description',
    'https://test.com',
    21,
    200,
    22.95,
    0.087,
    true,
    'drops alpaca',
    ARRAY['%boucl%', '%brushed%', '%silk%'],
    now(),
    now()
);

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
    'Filcolana Pernilla',
    'Filcolana Pernilla description',
    'https://test.com',
    21,
    200,
    22.95,
    0.087,
    true,
    'pernilla',
    ARRAY[''],
    now(),
    now()
);