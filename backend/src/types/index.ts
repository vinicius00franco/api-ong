// Core types for the application
export interface Organization {
  id: number
  name: string
  email: string
  passwordHash: string
  createdAt: Date
}

export interface Product {
  id: number
  name: string
  description: string
  price: number
  categoryId: number
  imageUrl: string
  stockQty: number
  weightGrams: number
  organizationId: number
  createdAt: Date
}

export interface Category {
  id: number
  name: string
  createdAt: Date
}

export interface Customer {
  id: number
  name?: string
  email?: string
  createdAt: Date
}

export interface Order {
  id: number
  customerId?: number
  createdAt: Date
}

export interface OrderItem {
  id: number
  orderId: number
  productId: number
  quantity: number
  priceAtTime: number
  organizationId: number
  createdAt: Date
}

// Request/Response types
export interface CreateProductRequest {
  name: string
  description: string
  price: number
  categoryId: number
  imageUrl: string
  stockQty: number
  weightGrams: number
}

export interface SearchFilters {
  category?: string
  priceMin?: number
  priceMax?: number
  organizationId?: number
}

export interface SearchResponse {
  products: Product[]
  interpretation: string
  aiSuccess: boolean
  fallbackApplied: boolean
}