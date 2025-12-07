# garnalternativer.dk

An affiliate marketing webapp that helps Danish (and later, all Scandinavian) knitters find answers to google searches like:

- "Garnalternativer til Spot Sweater"
- "Garnalternativer til October Sweater"
- etc.

The webapp garnalternativer.dk will have search engine optimized pages for these queries, consisting of:

- Knitting pattern specifications
- Knitting pattern image
- Knitting pattern suggested yarns (the yarns that the designer suggests for the pattern - usually rather expensive)
- A listing grid of yarn alternatives that can be used instead of the suggested yarns (these are usually much cheaper)
- A size selector
- An automatic calculation of skeins needed for the selected size
- A price comparison table showing the price of the skeins needed for the selected size for each yarn in the listing grid

## Frontend

The user interface, kept as simple (architecturally and visually) as possible.

### Stack

- Next.js
- React
- TypeScript
- TailwindCSS

## Backend

Consists of two parts:

1. A nightly cron job that reads product feeds from partner-ads.com and stores the data in a PostgreSQL database
2. An API that can be used to query the database for the data needed for the frontend

### Stack

- Node.js
- Express.js
- TypeScript
- PostgreSQL
- Docker