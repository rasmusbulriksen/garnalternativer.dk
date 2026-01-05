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

### Getting Started

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`.

**Note**: The frontend fetches yarn data from the backend API. Make sure the backend is running (see Backend section below).

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

### Quick Start

See `backend/README.md` for detailed instructions. Quick setup:

1. Start the database:
```bash
docker-compose up -d
```

2. Navigate to backend directory and install dependencies:
```bash
cd backend
npm install
```

3. Run the API server:
```bash
npm run dev
```

The API will be available at `http://localhost:3001` (port 3001 to avoid conflict with Next.js frontend).

4. Import product feeds (optional, for initial data):
```bash
npm run feed:import
```