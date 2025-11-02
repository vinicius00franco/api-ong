import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { OrderRepository } from './orderRepository';
import { Order, CreateOrderDto, OrderResponse } from './orderTypes';
import { ProductRepository } from '../products/productRepository';

@Injectable()
export class OrderService {
  constructor(
    private orderRepository: OrderRepository,
    private productRepository: ProductRepository,
  ) {}

  async create(orderData: CreateOrderDto, organizationId: number): Promise<OrderResponse> {
    // Validate all products exist and belong to the organization
    for (const item of orderData.items) {
      const product = await this.productRepository.findById(item.product_id.toString(), organizationId.toString());
      if (!product) {
        throw new BadRequestException(`Product ${item.product_id} not found or not accessible`);
      }
    }

    const order = await this.orderRepository.create({ ...orderData, organization_id: organizationId });

    const total = order.items.reduce((sum, item) => sum + (item.price_at_time * item.quantity), 0);

    return {
      id: order.id,
      customer_id: order.customer_id,
      items: order.items,
      total,
      created_at: order.created_at,
    };
  }

  async findAll(organizationId: number): Promise<OrderResponse[]> {
    const orders = await this.orderRepository.findAll(organizationId);
    return orders.map(order => ({
      id: order.id,
      customer_id: order.customer_id,
      items: order.items,
      total: order.items.reduce((sum, item) => sum + (item.price_at_time * item.quantity), 0),
      created_at: order.created_at,
    }));
  }

  async findById(id: number, organizationId: number): Promise<OrderResponse> {
    const order = await this.orderRepository.findById(id, organizationId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const total = order.items.reduce((sum, item) => sum + (item.price_at_time * item.quantity), 0);

    return {
      id: order.id,
      customer_id: order.customer_id,
      items: order.items,
      total,
      created_at: order.created_at,
    };
  }
}