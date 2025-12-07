-- ProductFeedAPI Database Schema
-- Run this to initialize the database

-- Products table
-- Stores yarn products from merchant feeds
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    
    -- Merchant information
    forhandler VARCHAR(255) NOT NULL,
    
    -- Product details
    brand VARCHAR(255),
    produktnavn VARCHAR(500) NOT NULL,
    produktid VARCHAR(255) NOT NULL,
    
    -- Pricing
    nypris DECIMAL(10, 2),
    glpris DECIMAL(10, 2),
    fragtomk DECIMAL(10, 2),
    
    -- Availability
    lagerantal VARCHAR(100),
    leveringstid VARCHAR(255),
    
    -- Product attributes
    color VARCHAR(255),
    
    -- Affiliate link
    vareurl TEXT NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint: same product from same merchant
    UNIQUE(forhandler, produktid)
);

-- Index for faster lookups by merchant
CREATE INDEX IF NOT EXISTS idx_products_forhandler ON products(forhandler);

-- Index for faster lookups by brand
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);

-- Index for product search by name
CREATE INDEX IF NOT EXISTS idx_products_produktnavn ON products(produktnavn);

