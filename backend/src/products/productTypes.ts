export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: number;
  imageUrl: string;
  stockQty: number;
  weightGrams: number;
  organizationId: number;
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
  create(product: CreateProductRequest & { organizationId: number }): Promise<Product>;
  findAll(organizationId: number): Promise<Product[]>;
  findById(id: string, organizationId: number): Promise<Product | null>;
  update(id: string, organizationId: number, updates: UpdateProductRequest): Promise<Product | null>;
  delete(id: string, organizationId: number): Promise<boolean>;
}