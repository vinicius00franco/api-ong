import { Product, CreateProductRequest, SearchFilters } from '@/types'

// Interface Segregation Principle - interface específica para produtos
export interface IProductRepository {
  findByOrganization(organizationId: number, limit?: number, offset?: number): Promise<Product[]>
  findById(id: number, organizationId: number): Promise<Product | null>
  create(data: CreateProductRequest, organizationId: number): Promise<Product>
  update(id: number, data: Partial<CreateProductRequest>, organizationId: number): Promise<Product | null>
  delete(id: number, organizationId: number): Promise<boolean>
  search(filters: SearchFilters, limit?: number, offset?: number): Promise<Product[]>
  searchByText(text: string, limit?: number, offset?: number): Promise<Product[]>
}