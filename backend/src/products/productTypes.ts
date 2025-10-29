export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  stock_qty: number;
  weight_grams: number;
  organization_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateProductRequest {
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  stock_qty: number;
  weight_grams: number;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  price?: number;
  category?: string;
  image_url?: string;
  stock_qty?: number;
  weight_grams?: number;
}

export interface IProductRepository {
  create(product: CreateProductRequest & { organization_id: string }): Promise<Product>;
  findAll(organization_id: string): Promise<Product[]>;
  findById(id: string, organization_id: string): Promise<Product | null>;
  update(id: string, organization_id: string, updates: UpdateProductRequest): Promise<Product | null>;
  delete(id: string, organization_id: string): Promise<boolean>;
}