import fs from 'fs';
import { XMLParser } from 'fast-xml-parser';

export interface RawProduct {
  forhandler: string;
  kategorinavn: string;
  brand?: string;
  produktnavn: string;
  produktid: string;
  nypris?: string;
  glpris?: string;
  lagerantal?: string;
  vareurl: string;
}

export interface Product {
  retailerName: string;
  retailers_product_id: string;
  brand: string | null;
  name: string;
  category: string | null;
  price_before_discount: number | null;
  price_after_discount: number | null;
  stock_status: string | null;
  url: string;
}

/**
 * Parse an XML product feed file and filter for yarn products
 */
export function parseProductFeed(filePath: string): Product[] {
  console.log(`📄 Reading feed: ${filePath}`);
  
  // Read file with latin1 encoding (iso-8859-1)
  const xmlContent = fs.readFileSync(filePath, 'latin1');
  
  const parser = new XMLParser({
    ignoreAttributes: true,
    parseTagValue: false, // Keep values as strings
  });
  
  const parsed = parser.parse(xmlContent);
  
  // Handle both single product and array of products
  const rawProducts: RawProduct[] = Array.isArray(parsed.produkter?.produkt)
    ? parsed.produkter.produkt
    : parsed.produkter?.produkt
      ? [parsed.produkter.produkt]
      : [];
  
  console.log(`📦 Total products in feed: ${rawProducts.length}`);
  
  // Filter for yarn products (kategorinavn contains "Garn")
  const yarnProducts = rawProducts.filter(p =>
    p.kategorinavn?.toLowerCase().includes('garn')
  );
  
  console.log(`🧶 Yarn products after filter: ${yarnProducts.length}`);
  
  // Transform to our Product type
  return yarnProducts.map(raw => ({
    retailerName: raw.forhandler,
    brand: raw.brand || null,
    name: raw.produktnavn,
    retailers_product_id: String(raw.produktid),
    category: raw.kategorinavn || null,
    price_before_discount: raw.glpris ? parseFloat(raw.glpris) : null,
    price_after_discount: raw.nypris ? parseFloat(raw.nypris) : null,
    stock_status: raw.lagerantal || null,
    url: raw.vareurl,
  }));
}

