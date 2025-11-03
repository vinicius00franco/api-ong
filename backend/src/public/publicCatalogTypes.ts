export interface PublicProduct {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  stock_qty: number;
  weight_grams: number;
  organization_id: number;
  rank?: number; // Para full-text search ranking
}

export interface PublicCatalogFilters {
  page?: number;
  limit?: number;
  category?: string;
  price_min?: number;
  price_max?: number;
}

export interface PublicCatalogResult {
  products: PublicProduct[];
  total: number;
  page: number;
  limit: number;
}
