/**
 * Registry of stock status values that indicate a product is in stock.
 * Add new variations as they are discovered from different retailers.
 */
const IN_STOCK_VARIANTS = [
  'in stock',
  'in_stock',
  'instock',
  'in-stock',
  'available',
  'på lager', // Danish
  'paa lager', // Danish alternative spelling
] as const;

/**
 * Numeric values > 0 also indicate stock availability
 */
function isNumericStockStatus(status: string | null): boolean {
  if (!status) return false;
  const num = parseInt(status, 10);
  return !isNaN(num) && num > 0;
}

/**
 * Normalizes stock status to a boolean indicating if product is in stock.
 * @param stockStatus - Raw stock status from product feed
 * @returns true if product is in stock, false otherwise
 */
export function isInStock(stockStatus: string | null): boolean {
  if (!stockStatus) return false;
  
  const normalized = stockStatus.toLowerCase().trim();
  
  // Check against known "in stock" variants
  if (IN_STOCK_VARIANTS.includes(normalized as any)) {
    return true;
  }
  
  // Check if it's a numeric value > 0
  if (isNumericStockStatus(normalized)) {
    return true;
  }
  
  return false;
}

/**
 * Get all known "in stock" variants (for debugging/admin purposes)
 */
export function getInStockVariants(): readonly string[] {
  return IN_STOCK_VARIANTS;
}

