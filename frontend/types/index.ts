export interface Retailer {
  name: string;
  url: string;
  price: number;
  // For double yarns, these URLs are retailer-specific
  mainYarnUrl?: string;
  carryAlongYarnUrl?: string;
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