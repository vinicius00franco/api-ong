export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: number;
  imageUrl: string;
  stockQty: number;
  weightGrams: number;
  organizationId: string;
  createdAt: Date;
}

export interface CreateProductRequest {
  name: string;
  description: string;
  price: number;
  categoryId: number;
  imageUrl: string;
  stockQty: number;
  weightGrams: number;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  price?: number;
  categoryId?: number;
  imageUrl?: string;
  stockQty?: number;
  weightGrams?: number;
}

export interface IProductRepository {
  create(product: CreateProductRequest & { organizationId: string }): Promise<Product>;
  findAll(organizationId: string): Promise<Product[]>;
  findById(id: string, organizationId: string): Promise<Product | null>;
  update(id: string, organizationId: string, updates: UpdateProductRequest): Promise<Product | null>;
  delete(id: string, organizationId: string): Promise<boolean>;
}