# ProductFeedAPI

## Project Description

This is the backend API for **garnalternativer.dk** - a website helping Danish (and later, all Scandinavian) people find alternative yarns for their knitting projects.

The API fetches product feeds from the Danish affiliate network [partner-ads.com](https://partner-ads.com) and stores yarn products in a PostgreSQL database. Revenue is generated through affiliate links.

## Tech Stack

- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL (containerized via Docker)

## How It Works

1. Every midnight, the API iterates through the merchant list in `merchants.json`
2. Downloads each merchant's product feed (XML) from partner-ads.com
3. Parses the XML and filters for yarn products (`kategorinavn` contains "Garn")
4. Saves the relevant product data to the database

## Product Feed Structure

All feeds from partner-ads.com share the same XML structure:

```xml
<?xml version="1.0" encoding="iso-8859-1"?>
<produkter>
  <produkt>
    <forhandler>Merchant Name</forhandler>
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

## Database Schema

### `products` table

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | Auto-generated ID |
| forhandler | VARCHAR | Merchant/retailer name |
| brand | VARCHAR | Yarn brand |
| produktnavn | VARCHAR | Product name |
| produktid | VARCHAR | Merchant's product ID |
| nypris | DECIMAL | Current price |
| glpris | DECIMAL | Original/old price |
| fragtomk | DECIMAL | Shipping cost |
| lagerantal | VARCHAR | Stock status |
| leveringstid | VARCHAR | Delivery time |
| color | VARCHAR | Color (nullable, not all feeds have this) |
| vareurl | TEXT | Affiliate link URL |
| created_at | TIMESTAMP | When the record was created |
| updated_at | TIMESTAMP | When the record was last updated |

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

For local development, sample product feeds are available in the `ProductFeeds/` directory:
- `ofeig-ko.dk.xml` (~1.5MB)
- `rito.dk.xml` (~32MB)

## Merchants

Merchants are configured in `merchants.json`:

```json
{
  "merchants": [
    {
      "name": "rito.dk",
      "product_feed_url": "https://www.partner-ads.com/dk/feed_udlaes.php?..."
    }
  ]
}
```

Feed URL format: `https://www.partner-ads.com/dk/feed_udlaes.php?partnerid=XXXXX&bannerid=XXXXX&feedid=XXX`
