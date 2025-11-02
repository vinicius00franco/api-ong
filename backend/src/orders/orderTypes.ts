export interface Order {
  id: number;
  customer_id?: number;
  organization_id: number;
  created_at: Date;
  items: OrderItem[];
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  price_at_time: number;
  organization_id: number;
  created_at: Date;
  product?: {
    id: number;
    name: string;
    price: number;
  };
}

export interface CreateOrderDto {
  customer_id?: number;
  items: {
    product_id: number;
    quantity: number;
  }[];
}

export interface OrderResponse {
  id: number;
  customer_id?: number;
  items: OrderItem[];
  total: number;
  created_at: Date;
}