import { Injectable } from '@nestjs/common';
import { getDb } from '../lib/dbContext';
import { Order, OrderItem, CreateOrderDto } from './orderTypes';

export interface IOrderRepository {
  create(order: CreateOrderDto & { organizationId: number }): Promise<Order>;
  findAll(organizationId: number): Promise<Order[]>;
  findById(id: number, organizationId: number): Promise<Order | null>;
}

@Injectable()
export class OrderRepository implements IOrderRepository {
  async create(orderData: CreateOrderDto & { organizationId: number }): Promise<Order> {
    // Insert order
    const orderQuery = `
      INSERT INTO orders (customer_id)
      VALUES ($1)
      RETURNING id, customer_id, created_at
    `;
    const orderValues = [orderData.customerId];
    const orderResult = await getDb().query(orderQuery, orderValues);
    const newOrder = orderResult.rows[0];

    // Insert order items
    const items: OrderItem[] = [];
    for (const item of orderData.items) {
      // Get current product price
      const productQuery = 'SELECT price FROM products WHERE id = $1 AND organization_id = $2';
      const productResult = await getDb().query(productQuery, [item.productId, orderData.organizationId]);
      if (productResult.rows.length === 0) {
        throw new Error(`Product ${item.productId} not found or not accessible`);
      }
      const price = productResult.rows[0].price;

      const itemQuery = `
        INSERT INTO order_items (order_id, product_id, quantity, price_at_time, organization_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, order_id, product_id, quantity, price_at_time, organization_id, created_at
      `;
      const itemValues = [newOrder.id, item.productId, item.quantity, price, orderData.organizationId];
      const itemResult = await getDb().query(itemQuery, itemValues);
      const row = itemResult.rows[0];
      items.push({
        id: row.id,
        orderId: row.order_id,
        productId: row.product_id,
        quantity: row.quantity,
        priceAtTime: row.price_at_time,
        organizationId: row.organization_id,
        createdAt: row.created_at,
      });
    }

    return {
      id: newOrder.id,
      customerId: newOrder.customer_id,
      organizationId: orderData.organizationId,
      createdAt: newOrder.created_at,
      items,
    };
  }

  async findAll(organizationId: number): Promise<Order[]> {
    const query = `
      SELECT o.id, o.customer_id, o.created_at,
             oi.id as item_id, oi.product_id, oi.quantity, oi.price_at_time, oi.created_at as item_created_at,
             p.name as product_name, p.price as current_price
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.organization_id = $1
      ORDER BY o.created_at DESC, oi.id
    `;
    const result = await getDb().query(query, [organizationId]);

    const ordersMap = new Map<number, Order>();

    result.rows.forEach(row => {
      if (!ordersMap.has(row.id)) {
        ordersMap.set(row.id, {
          id: row.id,
          customerId: row.customer_id,
          organizationId,
          createdAt: row.created_at,
          items: [],
        });
      }

      if (row.item_id) {
        ordersMap.get(row.id)!.items.push({
          id: row.item_id,
          orderId: row.id,
          productId: row.product_id,
          quantity: row.quantity,
          priceAtTime: row.price_at_time,
          organizationId,
          createdAt: row.item_created_at,
          product: row.product_name ? {
            id: row.product_id,
            name: row.product_name,
            price: row.current_price,
          } : undefined,
        });
      }
    });

    return Array.from(ordersMap.values());
  }

  async findById(id: number, organizationId: number): Promise<Order | null> {
    const query = `
      SELECT o.id, o.customer_id, o.created_at,
             oi.id as item_id, oi.product_id, oi.quantity, oi.price_at_time, oi.created_at as item_created_at,
             p.name as product_name, p.price as current_price
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.id = $1 AND oi.organization_id = $2
      ORDER BY oi.id
    `;
    const result = await getDb().query(query, [id, organizationId]);

    if (result.rows.length === 0) return null;

    const order: Order = {
      id: result.rows[0].id,
      customerId: result.rows[0].customer_id,
      organizationId,
      createdAt: result.rows[0].created_at,
      items: result.rows.map(row => ({
        id: row.item_id,
        orderId: row.id,
        productId: row.product_id,
        quantity: row.quantity,
        priceAtTime: row.price_at_time,
        organizationId,
        createdAt: row.item_created_at,
        product: row.product_name ? {
          id: row.product_id,
          name: row.product_name,
          price: row.current_price,
        } : undefined,
      })),
    };

    return order;
  }
}