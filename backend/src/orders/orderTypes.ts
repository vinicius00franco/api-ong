export interface Order {
  id: number;
  customerId?: number;
  organizationId: number;
  createdAt: Date;
  items: OrderItem[];
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  priceAtTime: number;
  organizationId: number;
  createdAt: Date;
  product?: {
    id: number;
    name: string;
    price: number;
  };
}

export interface CreateOrderDto {
  customerId?: number;
  items: {
    productId: number;
    quantity: number;
  }[];
}

export interface OrderResponse {
  id: number;
  customerId?: number;
  items: OrderItem[];
  total: number;
  createdAt: Date;
}