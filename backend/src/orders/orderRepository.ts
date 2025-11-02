import { Injectable } from '@nestjs/common';
import { getDb } from '../lib/dbContext';
import { Order, OrderItem, CreateOrderDto } from './orderTypes';

export interface IOrderRepository {
  create(order: CreateOrderDto & { organization_id: number }): Promise<Order>;
  findAll(organization_id: number): Promise<Order[]>;
  findById(id: number, organization_id: number): Promise<Order | null>;
}

@Injectable()
export class OrderRepository implements IOrderRepository {
  async create(orderData: CreateOrderDto & { organization_id: number }): Promise<Order> {
    // Insert order
    const orderQuery = `
      INSERT INTO orders (customer_id)
      VALUES ($1)
      RETURNING id, customer_id, created_at
    `;
    const orderValues = [orderData.customer_id];
    const orderResult = await getDb().query(orderQuery, orderValues);
    const newOrder = orderResult.rows[0];

    // Insert order items
    const items: OrderItem[] = [];
    for (const item of orderData.items) {
      // Get current product price
      const productQuery = 'SELECT price FROM products WHERE id = $1 AND organization_id = $2';
      const productResult = await getDb().query(productQuery, [item.product_id, orderData.organization_id]);
      if (productResult.rows.length === 0) {
        throw new Error(`Product ${item.product_id} not found or not accessible`);
      }
      const price = productResult.rows[0].price;

      const itemQuery = `
        INSERT INTO order_items (order_id, product_id, quantity, price_at_time, organization_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, order_id, product_id, quantity, price_at_time, organization_id, created_at
      `;
      const itemValues = [newOrder.id, item.product_id, item.quantity, price, orderData.organization_id];
      const itemResult = await getDb().query(itemQuery, itemValues);
      items.push(itemResult.rows[0]);
    }

    return {
      ...newOrder,
      organization_id: orderData.organization_id,
      items,
    };
  }

  async findAll(organization_id: number): Promise<Order[]> {
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
    const result = await getDb().query(query, [organization_id]);

    const ordersMap = new Map<number, Order>();

    result.rows.forEach(row => {
      if (!ordersMap.has(row.id)) {
        ordersMap.set(row.id, {
          id: row.id,
          customer_id: row.customer_id,
          organization_id,
          created_at: row.created_at,
          items: [],
        });
      }

      if (row.item_id) {
        ordersMap.get(row.id)!.items.push({
          id: row.item_id,
          order_id: row.id,
          product_id: row.product_id,
          quantity: row.quantity,
          price_at_time: row.price_at_time,
          organization_id,
          created_at: row.item_created_at,
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

  async findById(id: number, organization_id: number): Promise<Order | null> {
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
    const result = await getDb().query(query, [id, organization_id]);

    if (result.rows.length === 0) return null;

    const order: Order = {
      id: result.rows[0].id,
      customer_id: result.rows[0].customer_id,
      organization_id,
      created_at: result.rows[0].created_at,
      items: result.rows.map(row => ({
        id: row.item_id,
        order_id: row.id,
        product_id: row.product_id,
        quantity: row.quantity,
        price_at_time: row.price_at_time,
        organization_id,
        created_at: row.item_created_at,
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