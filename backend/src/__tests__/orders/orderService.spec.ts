import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from '../../orders/orderService';
import { OrderRepository } from '../../orders/orderRepository';
import { ProductRepository } from '../../products/productRepository';
import { CreateOrderDto, OrderResponse } from '../../orders/orderTypes';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('OrderService', () => {
  let service: OrderService;
  let orderRepository: jest.Mocked<OrderRepository>;
  let productRepository: jest.Mocked<ProductRepository>;

  beforeEach(async () => {
    const mockOrderRepository = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
    };
    const mockProductRepository = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: OrderRepository,
          useValue: mockOrderRepository,
        },
        {
          provide: ProductRepository,
          useValue: mockProductRepository,
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    orderRepository = module.get(OrderRepository);
    productRepository = module.get(ProductRepository);
  });

  describe('create', () => {
    it('should create an order', async () => {
      const createRequest: CreateOrderDto = {
        customer_id: 1,
        items: [
          { product_id: 1, quantity: 2 },
          { product_id: 2, quantity: 1 },
        ],
      };
      const organizationId = 1;
      const createdOrder = {
        id: 1,
        customer_id: 1,
        organization_id: 1,
        created_at: new Date(),
        items: [
          {
            id: 1,
            order_id: 1,
            product_id: 1,
            quantity: 2,
            price_at_time: 10.50,
            organization_id: 1,
            created_at: new Date(),
          },
          {
            id: 2,
            order_id: 1,
            product_id: 2,
            quantity: 1,
            price_at_time: 20.00,
            organization_id: 1,
            created_at: new Date(),
          },
        ],
      };

      productRepository.findById
        .mockResolvedValueOnce({
          id: '1',
          name: 'Product 1',
          price: 10.50,
          organization_id: '1',
        } as any)
        .mockResolvedValueOnce({
          id: '2',
          name: 'Product 2',
          price: 20.00,
          organization_id: '1',
        } as any);

      orderRepository.create.mockResolvedValue(createdOrder);

      const result = await service.create(createRequest, organizationId);

      expect(result).toEqual({
        id: 1,
        customer_id: 1,
        items: createdOrder.items,
        total: 41.00, // (10.50 * 2) + (20.00 * 1)
        created_at: createdOrder.created_at,
      });
      expect(orderRepository.create).toHaveBeenCalledWith({ ...createRequest, organization_id: organizationId });
    });

    it('should throw BadRequest for invalid product_id', async () => {
      const createRequest: CreateOrderDto = {
        customer_id: 1,
        items: [{ product_id: 999, quantity: 1 }],
      };
      const organizationId = 1;

      productRepository.findById.mockResolvedValue(null);

      await expect(service.create(createRequest, organizationId)).rejects.toThrow(BadRequestException);
      expect(productRepository.findById).toHaveBeenCalledWith('999', '1');
      expect(orderRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all orders for organization', async () => {
      const organizationId = 1;
      const orders = [{
        id: 1,
        customer_id: 1,
        organization_id: 1,
        created_at: new Date(),
        items: [{
          id: 1,
          order_id: 1,
          product_id: 1,
          quantity: 2,
          price_at_time: 10.50,
          organization_id: 1,
          created_at: new Date(),
        }],
      }];

      orderRepository.findAll.mockResolvedValue(orders);

      const result = await service.findAll(organizationId);

      expect(result).toEqual([{
        id: 1,
        customer_id: 1,
        items: orders[0].items,
        total: 21.00, // 10.50 * 2
        created_at: orders[0].created_at,
      }]);
      expect(orderRepository.findAll).toHaveBeenCalledWith(organizationId);
    });
  });

  describe('findById', () => {
    it('should return order if found', async () => {
      const id = 1;
      const organizationId = 1;
      const order = {
        id: 1,
        customer_id: 1,
        organization_id: 1,
        created_at: new Date(),
        items: [{
          id: 1,
          order_id: 1,
          product_id: 1,
          quantity: 2,
          price_at_time: 10.50,
          organization_id: 1,
          created_at: new Date(),
        }],
      };

      orderRepository.findById.mockResolvedValue(order);

      const result = await service.findById(id, organizationId);

      expect(result).toEqual({
        id: 1,
        customer_id: 1,
        items: order.items,
        total: 21.00, // 10.50 * 2
        created_at: order.created_at,
      });
      expect(orderRepository.findById).toHaveBeenCalledWith(id, organizationId);
    });

    it('should throw NotFoundException if not found', async () => {
      const id = 1;
      const organizationId = 1;

      orderRepository.findById.mockResolvedValue(null);

      await expect(service.findById(id, organizationId)).rejects.toThrow(NotFoundException);
    });
  });
});