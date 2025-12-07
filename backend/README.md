# Backend

## How It Works

1. Every midnight, the API iterates through the retailer list in `retailers.json`
2. Downloads each retailer's product feed (XML) from partner-ads.com
3. Parses the XML and filters for yarn products (`kategorinavn` contains "Garn")
4. Saves the relevant product data into `product` (one row per retailer product)
5. Curates normalized yarn rows in `yarn` (one canonical yarn matching many product swatches)
6. Patterns can be matched to yarns by equal `tension`

## Data Flow (nightly)

- Fetch all retailer feeds listed in `retailers.json`
- Parse XML and discard non‑yarn rows (currently `kategorinavn` contains "Garn"; stricter rules TBD)
- Upsert into `product` keyed by `(retailer_id, retailers_product_id)`; keep one row per retailer product/swatches
- Aggregate products into canonical `yarn` rows (multiple retailer/color variants → one yarn)
- Patterns link to yarns via matching `tension`

Latest ERD lives in `backend/diagrams/er-diagram.md` (source of truth).

## Product Feed Structure

All feeds from partner-ads.com share the same XML structure:

```xml
<?xml version="1.0" encoding="iso-8859-1"?>
<produkter>
  <produkt>
    <forhandler>Retailer Name</forhandler>
    <kategorinavn>Garn</kategorinavn>
    <brand>Brand Name</brand>
    <produktnavn>Product Name</produktnavn>
    <produktid>12345</produktid>
    <nypris>45.00</nypris>
    <glpris>50.00</glpris>
    <fragtomk>42</fragtomk>
    <lagerantal>in stock</lagerantal>
    <leveringstid>1-4 dage</leveringstid>
    <color>Color Name</color>
    <vareurl>https://affiliate-link...</vareurl>
  </produkt>
</produkter>
```

## Database Schema (mirrors `backend/diagrams/er-diagram.md`)

### `retailer`

| Column | Type | Description |
|--------|------|-------------|
| retailer_id | SERIAL PK | Retailer id |
| name | VARCHAR(255) | Retailer name |
| product_feed_url | VARCHAR(255) | XML feed URL |
| banner_id | INT | Partner-ads banner id |
| feed_id | INT | Partner-ads feed id |
| delivery_time | VARCHAR(255) | Delivery time text |
| delivery_price | DECIMAL | Delivery cost (DKK) |
| created_at | TIMESTAMP | Created timestamp |
| updated_at | TIMESTAMP | Updated timestamp |

### `product`

| Column | Type | Description |
|--------|------|-------------|
| product_id | SERIAL PK | Product row id |
| retailer_id | INT FK → retailer | Owning retailer |
| retailers_product_id | TEXT | Retailer-supplied id |
| brand | TEXT | Brand |
| name | TEXT | Product name |
| category | TEXT | Category label from feed |
| yarn_id | INT FK → yarn | Matched canonical yarn |
| price_before_discount | DECIMAL | List/original price |
| price_after_discount | DECIMAL | Current price |
| stock_status | VARCHAR(255) | Stock status text |
| url | TEXT | Product URL |
| search_tsv | TSVECTOR | Generated: brand + name + category |
| created_at | TIMESTAMP | Created timestamp |
| updated_at | TIMESTAMP | Updated timestamp |

### `yarn`

| Column | Type | Description |
|--------|------|-------------|
| yarn_id | SERIAL PK | Canonical yarn id |
| name | VARCHAR(255) | Canonical yarn name |
| description | TEXT | Marketing/feature copy |
| image_url | VARCHAR(255) | CDN/public image |
| tension | INT | Gauge/tension |
| skein_length | INT | Length per skein |
| lowest_price_on_the_market | INT | Cached min price (DKK) |
| price_per_meter | DECIMAL | Derived metric |
| is_active | BOOLEAN | Toggle for frontend |
| search_query | TEXT | Saved search query used for matching |
| negative_keywords | TEXT[] | Terms to exclude when matching |
| created_at | TIMESTAMP | Created timestamp |
| updated_at | TIMESTAMP | Updated timestamp |
| active_since | TIMESTAMP | First activation |
| inactive_since | TIMESTAMP | Deactivation timestamp |

### `pattern`

| Column | Type | Description |
|--------|------|-------------|
| pattern_id | SERIAL PK | Pattern id |
| name | VARCHAR(255) | Pattern name |
| image_url | VARCHAR(255) | Image |
| designer | VARCHAR(255) | Designer name |
| difficulty | INT | Difficulty rating |
| description | TEXT | Pattern description |
| tension | INT | Gauge/tension requirement |
| created_at | TIMESTAMP | Created timestamp |
| updated_at | TIMESTAMP | Updated timestamp |

## Getting Started

### Prerequisites

- Node.js (v18+)
- Docker & Docker Compose

### 1. Start the Database

```bash
docker-compose up -d
```

This starts a PostgreSQL container with:

- **Host:** localhost
- **Port:** 5432
- **Database:** productfeed
- **User:** productfeed
- **Password:** productfeed_secret

### 2. Install Dependencies

```bash
npm install
```

### 3. Run the API

```bash
npm run dev
```

## Development

For reference, two sample product feeds are available in the `xml-product-feeds-for-dev/` directory:

- `ofeig-ko.dk.xml` (~1.5MB)
- `rito.dk.xml` (~32MB)

### Aggregation (development flow)

- On each feed import we truncate `product_imported` and `product_aggregated` (dev-only full refresh).
- We import raw rows into `product_imported`.
- For each `yarn` with `search_query`, we pick the cheapest `product_imported` per retailer where `name ILIKE '%search_query%'` and `name NOT ILIKE ANY(negative_keywords)`, then insert those rows into `product_aggregated`.
- Ties are resolved by lowest `product_imported_id`.

## Retailers

Retailers are configured in `retailers.json`:

```json
{
  "retailers": [
    {
      "name": "rito.dk",
      "product_feed_url": "https://www.partner-ads.com/dk/feed_udlaes.php?..."
    }
  ]
}
```

Feed URL format: `https://www.partner-ads.com/dk/feed_udlaes.php?partnerid=46912&bannerid=XXXXX&feedid=XXX`
