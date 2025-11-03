import { RateLimitMiddleware } from '../../middleware/rateLimitMiddleware';
import { HttpException } from '@nestjs/common';
import { Request, Response } from 'express';

describe('Rate Limiting Middleware', () => {
  let middleware: RateLimitMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    middleware = new RateLimitMiddleware();
    mockNext = jest.fn();
    mockResponse = {};
  });

  describe('IP-based rate limiting', () => {
    it('should allow 10 requests per minute from same IP', async () => {
      for (let i = 0; i < 10; i++) {
        mockRequest = { ip: '192.168.1.1', path: '/public/search', query: { q: `test${i}` } } as any;
        await middleware.use(mockRequest as any, mockResponse as any, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(10);
    });

    it('should block 11th request from same IP within 1 minute', async () => {
      for (let i = 0; i < 10; i++) {
        mockRequest = { ip: '192.168.1.1', path: '/public/search', query: { q: `test${i}` } } as any;
        await middleware.use(mockRequest as any, mockResponse as any, mockNext);
      }

      mockRequest = { ip: '192.168.1.1', path: '/public/search', query: { q: 'test11' } } as any;
      await expect(
        middleware.use(mockRequest as any, mockResponse as any, mockNext)
      ).rejects.toThrow(HttpException);
      await expect(
        middleware.use(mockRequest as any, mockResponse as any, mockNext)
      ).rejects.toThrow('Muitas requisições. Tente novamente em 1 minuto.');
    });

    it('should allow requests from different IPs', async () => {
      for (let i = 0; i < 10; i++) {
        const req1 = { ip: '192.168.1.1', path: '/public/search', query: { q: `test${i}` } } as any;
        const req2 = { ip: '192.168.1.2', path: '/public/search', query: { q: `test${i}` } } as any;
        await middleware.use(req1, mockResponse as any, mockNext);
        await middleware.use(req2, mockResponse as any, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(20);
    });
  });

  describe('User-based rate limiting', () => {
    it('should allow 50 requests per hour from authenticated user', async () => {
      for (let i = 0; i < 50; i++) {
        mockRequest = {
          ip: '192.168.1.1',
          path: '/public/search',
          query: { q: `test${i}` },
          user: { id: 'user-123' },
        } as any;
        await middleware.use(mockRequest as any, mockResponse as any, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(50);
    });

    it('should block 51st request from same user within 1 hour', async () => {
      for (let i = 0; i < 50; i++) {
        mockRequest = {
          ip: '192.168.1.1',
          path: '/public/search',
          query: { q: `test${i}` },
          user: { id: 'user-123' },
        } as any;
        await middleware.use(mockRequest as any, mockResponse as any, mockNext);
      }

      mockRequest = {
        ip: '192.168.1.1',
        path: '/public/search',
        query: { q: 'test51' },
        user: { id: 'user-123' },
      } as any;

      await expect(
        middleware.use(mockRequest as any, mockResponse as any, mockNext)
      ).rejects.toThrow('Limite de buscas por hora excedido. Tente novamente em 1 hora.');
    });
  });

  describe('Spam detection', () => {
    it('should block identical queries within 5 seconds', async () => {
      mockRequest = { ip: '192.168.1.1', path: '/public/search', query: { q: 'chocolate' } } as any;

      await middleware.use(mockRequest as any, mockResponse as any, mockNext);
      await middleware.use(mockRequest as any, mockResponse as any, mockNext);

      await expect(
        middleware.use(mockRequest as any, mockResponse as any, mockNext)
      ).rejects.toThrow('Query duplicada detectada. Aguarde 5 segundos.');
    });

    it('should allow identical queries after 5 seconds', async () => {
      jest.useFakeTimers();
      mockRequest = { ip: '192.168.1.1', path: '/public/search', query: { q: 'chocolate' } } as any;

      await middleware.use(mockRequest as any, mockResponse as any, mockNext);
      
      jest.advanceTimersByTime(6000);
      
      await middleware.use(mockRequest as any, mockResponse as any, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(2);
      jest.useRealTimers();
    });

    it('should allow different queries from same IP', async () => {
      const req1 = { ip: '192.168.1.1', path: '/public/search', query: { q: 'chocolate' } } as any;
      const req2 = { ip: '192.168.1.1', path: '/public/search', query: { q: 'doces' } } as any;

      await middleware.use(req1, mockResponse as any, mockNext);
      await middleware.use(req2, mockResponse as any, mockNext);
      await middleware.use(req1, mockResponse as any, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(3);
    });
  });
});
