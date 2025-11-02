import { Test, TestingModule } from '@nestjs/testing';
import { OrderRepository } from '../../orders/orderRepository';
import { pool } from '../../lib/database';

jest.mock('../../lib/database', () => ({
  pool: {
    query: jest.fn(),
  },
}));

describe('OrderRepository', () => {
  let repository: OrderRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderRepository],
    }).compile();

    repository = module.get<OrderRepository>(OrderRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an order with items', async () => {
      const orderData = {
        customer_id: 1,
        items: [
          { product_id: 1, quantity: 2 },
          { product_id: 2, quantity: 1 },
        ],
        organization_id: 1,
      };

      const mockOrder = { id: 1, customer_id: 1, created_at: new Date() };
      const mockProduct1 = { price: 10.50 };
      const mockProduct2 = { price: 20.00 };
      const mockItem1 = { id: 1, order_id: 1, product_id: 1, quantity: 2, price_at_time: 10.50, organization_id: 1, created_at: new Date() };
      const mockItem2 = { id: 2, order_id: 1, product_id: 2, quantity: 1, price_at_time: 20.00, organization_id: 1, created_at: new Date() };

      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockOrder] }) // order insert
        .mockResolvedValueOnce({ rows: [mockProduct1] }) // product 1 price
        .mockResolvedValueOnce({ rows: [mockItem1] }) // item 1 insert
        .mockResolvedValueOnce({ rows: [mockProduct2] }) // product 2 price
        .mockResolvedValueOnce({ rows: [mockItem2] }); // item 2 insert

      const result = await repository.create(orderData);

      expect(result).toEqual({
        ...mockOrder,
        organization_id: 1,
        items: [mockItem1, mockItem2],
      });
      expect(pool.query).toHaveBeenCalledTimes(5);
    });

    it('should throw error if product not found', async () => {
      const orderData = {
        customer_id: 1,
        items: [{ product_id: 999, quantity: 1 }],
        organization_id: 1,
      };

      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 1, customer_id: 1, created_at: new Date() }] }) // order insert
        .mockResolvedValueOnce({ rows: [] }); // product not found

      await expect(repository.create(orderData)).rejects.toThrow('Product 999 not found or not accessible');
    });
  });

  describe('findAll', () => {
    it('should return all orders for organization', async () => {
      const organizationId = 1;
      const mockRows = [
        {
          id: 1,
          customer_id: 1,
          created_at: new Date(),
          item_id: 1,
          product_id: 1,
          quantity: 2,
          price_at_time: 10.50,
          item_created_at: new Date(),
          product_name: 'Product 1',
          current_price: 10.50,
        },
      ];

      (pool.query as jest.Mock).mockResolvedValue({ rows: mockRows });

      const result = await repository.findAll(organizationId);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 1,
        customer_id: 1,
        organization_id: 1,
        created_at: mockRows[0].created_at,
        items: [{
          id: 1,
          order_id: 1,
          product_id: 1,
          quantity: 2,
          price_at_time: 10.50,
          organization_id: 1,
          created_at: mockRows[0].item_created_at,
          product: {
            id: 1,
            name: 'Product 1',
            price: 10.50,
          },
        }],
      });
    });
  });

  describe('findById', () => {
    it('should return order if found', async () => {
      const id = 1;
      const organizationId = 1;
      const mockRows = [
        {
          id: 1,
          customer_id: 1,
          created_at: new Date(),
          item_id: 1,
          product_id: 1,
          quantity: 2,
          price_at_time: 10.50,
          item_created_at: new Date(),
          product_name: 'Product 1',
          current_price: 10.50,
        },
      ];

      (pool.query as jest.Mock).mockResolvedValue({ rows: mockRows });

      const result = await repository.findById(id, organizationId);

      expect(result).toEqual({
        id: 1,
        customer_id: 1,
        organization_id: 1,
        created_at: mockRows[0].created_at,
        items: [{
          id: 1,
          order_id: 1,
          product_id: 1,
          quantity: 2,
          price_at_time: 10.50,
          organization_id: 1,
          created_at: mockRows[0].item_created_at,
          product: {
            id: 1,
            name: 'Product 1',
            price: 10.50,
          },
        }],
      });
    });

    it('should return null if not found', async () => {
      const id = 1;
      const organizationId = 1;

      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await repository.findById(id, organizationId);

      expect(result).toBeNull();
    });
  });
});