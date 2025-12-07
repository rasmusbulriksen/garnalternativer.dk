-- ProductFeedAPI Database Schema
-- Source of truth: backend/diagrams/er-diagram.md

-- Retailers
CREATE TABLE IF NOT EXISTS retailer (
    retailer_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    product_feed_url VARCHAR(255) NOT NULL UNIQUE,
    banner_id INT,
    feed_id INT,
    delivery_time VARCHAR(255),
    delivery_price DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Canonical yarns
CREATE TABLE IF NOT EXISTS yarn (
    yarn_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    image_url VARCHAR(255),
    tension INT,
    skein_length INT,
    lowest_price_on_the_market INT,
    price_per_meter DECIMAL(10, 4),
    is_active BOOLEAN DEFAULT TRUE,
    search_query TEXT,
    negative_keywords TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    active_since TIMESTAMP WITH TIME ZONE,
    inactive_since TIMESTAMP WITH TIME ZONE
);

-- Patterns (matched to yarns via tension)
CREATE TABLE IF NOT EXISTS pattern (
    pattern_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    image_url VARCHAR(255),
    designer VARCHAR(255),
    difficulty INT,
    description TEXT,
    tension INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Retailer products (one row per retailer/swatches)
CREATE TABLE IF NOT EXISTS product (
    product_id SERIAL PRIMARY KEY,
    retailer_id INT NOT NULL REFERENCES retailer(retailer_id),
    retailers_product_id TEXT NOT NULL,
    brand TEXT,
    name TEXT NOT NULL,
    category TEXT,
    yarn_id INT REFERENCES yarn(yarn_id),
    price_before_discount DECIMAL(10, 2),
    price_after_discount DECIMAL(10, 2),
    stock_status VARCHAR(255),
    url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_product_retailer_id ON product(retailer_id);
CREATE INDEX IF NOT EXISTS idx_product_yarn_id ON product(yarn_id);
CREATE INDEX IF NOT EXISTS idx_product_brand ON product(brand);
CREATE INDEX IF NOT EXISTS idx_product_name ON product(name);
CREATE INDEX IF NOT EXISTS idx_yarn_tension ON yarn(tension);

