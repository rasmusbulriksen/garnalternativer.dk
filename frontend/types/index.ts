// Retailer entity (matches database retailer table)
export interface Retailer {
  name: string;
}

// A retailer offering a single yarn at a specific price
export interface SingleYarnOffer {
  retailer: Retailer;
  productUrl: string;
  price: number;
}

// A retailer offering both component yarns of a double yarn
export interface DoubleYarnOffer {
  retailer: Retailer;
  mainYarn: {
    productUrl: string;
    price: number;
  };
  carryAlongYarn: {
    productUrl: string;
    price: number;
  };
  combinedPrice: number;
}

export interface Pattern {
  id: string;
  name: string;
  image: string;
  designer: string;
  difficulty: number; // 1-5 stars (1 = easy, 5 = hard)
  description: string;
  sizes: {
    [key: string]: number; // XS - 3XL
  };
}