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
  fragtomk?: string;
  lagerantal?: string;
  leveringstid?: string;
  color?: string;
  vareurl: string;
}

export interface Product {
  forhandler: string;
  brand: string | null;
  produktnavn: string;
  produktid: string;
  nypris: number | null;
  glpris: number | null;
  fragtomk: number | null;
  lagerantal: string | null;
  leveringstid: string | null;
  color: string | null;
  vareurl: string;
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
    forhandler: raw.forhandler,
    brand: raw.brand || null,
    produktnavn: raw.produktnavn,
    produktid: String(raw.produktid),
    nypris: raw.nypris ? parseFloat(raw.nypris) : null,
    glpris: raw.glpris ? parseFloat(raw.glpris) : null,
    fragtomk: raw.fragtomk ? parseFloat(raw.fragtomk) : null,
    lagerantal: raw.lagerantal || null,
    leveringstid: raw.leveringstid || null,
    color: raw.color || null,
    vareurl: raw.vareurl,
  }));
}

