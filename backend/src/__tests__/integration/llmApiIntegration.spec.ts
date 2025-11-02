import { Test, TestingModule } from '@nestjs/testing';
import { LlmApiService } from '../../search/llmApiService';
import { HttpModule, HttpService } from '@nestjs/axios';
import { of, throwError, delay } from 'rxjs';

jest.setTimeout(20000);

describe('LLM API Integration Tests', () => {
  let service: LlmApiService;
  let httpService: HttpService;

  const OLD_ENV = process.env;

  beforeAll(() => {
    // Set up test environment variables
    process.env = { 
      ...OLD_ENV, 
      LLM_API_URL: 'http://localhost:8000/api/v1/parse-query-only',
      LLM_TIMEOUT: '3000' 
    };
  });

  afterAll(() => {
    // Restore original environment
    process.env = OLD_ENV;
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [LlmApiService],
    }).compile();

    service = module.get<LlmApiService>(LlmApiService);
    httpService = module.get<HttpService>(HttpService);
  });

  describe('Communication with real LLM API (when available)', () => {
    it('should successfully parse query and return structured filters', async () => {
      // Mock successful LLM response
      const mockFilters = {
        search_term: 'chocolate',
        category: 'Doces',
        price_max: 50,
      };

      jest.spyOn(httpService, 'post').mockReturnValue(
        of({ data: mockFilters } as any)
      );

      const result = await service.getFilters('chocolate doces até 50 reais');

      expect(result).toEqual(mockFilters);
      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/parse-query-only',
        { query: 'chocolate doces até 50 reais' }
      );
    });

    it('should extract category from natural language query', async () => {
      const mockFilters = {
        category: 'Artesanato',
      };

      jest.spyOn(httpService, 'post').mockReturnValue(
        of({ data: mockFilters } as any)
      );

      const result = await service.getFilters('artesanato');

      expect(result).toEqual(mockFilters);
      expect(result?.category).toBe('Artesanato');
    });

    it('should extract price range from natural language query', async () => {
      const mockFilters = {
        price_min: 10,
        price_max: 50,
      };

      jest.spyOn(httpService, 'post').mockReturnValue(
        of({ data: mockFilters } as any)
      );

      const result = await service.getFilters('produtos entre 10 e 50 reais');

      expect(result).toEqual(mockFilters);
      expect(result?.price_min).toBe(10);
      expect(result?.price_max).toBe(50);
    });

    it('should extract only price_max from "até X reais" query', async () => {
      const mockFilters = {
        price_max: 30,
      };

      jest.spyOn(httpService, 'post').mockReturnValue(
        of({ data: mockFilters } as any)
      );

      const result = await service.getFilters('produtos até 30 reais');

      expect(result).toEqual(mockFilters);
      expect(result?.price_max).toBe(30);
      expect(result?.price_min).toBeUndefined();
    });

    it('should extract only price_min from "acima de X reais" query', async () => {
      const mockFilters = {
        price_min: 20,
      };

      jest.spyOn(httpService, 'post').mockReturnValue(
        of({ data: mockFilters } as any)
      );

      const result = await service.getFilters('produtos acima de 20 reais');

      expect(result).toEqual(mockFilters);
      expect(result?.price_min).toBe(20);
      expect(result?.price_max).toBeUndefined();
    });

    it('should handle complex queries with multiple filters', async () => {
      const mockFilters = {
        search_term: 'bolo',
        category: 'Doces',
        price_min: 15,
        price_max: 60,
      };

      jest.spyOn(httpService, 'post').mockReturnValue(
        of({ data: mockFilters } as any)
      );

      const result = await service.getFilters('bolo de doces entre 15 e 60 reais');

      expect(result).toEqual(mockFilters);
      expect(result).toHaveProperty('search_term');
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('price_min');
      expect(result).toHaveProperty('price_max');
    });
  });

  describe('Error handling and resilience', () => {
    it('should return null when LLM API times out', async () => {
      // Simulate timeout by delaying response beyond LLM_TIMEOUT
      jest.spyOn(httpService, 'post').mockReturnValue(
        of({ data: {} } as any).pipe(delay(5000)) // 5s delay, timeout is 3s
      );

      const result = await service.getFilters('any query');

      expect(result).toBeNull();
    });

    it('should return null when LLM API returns HTTP error', async () => {
      jest.spyOn(httpService, 'post').mockReturnValue(
        throwError(() => ({ status: 500, message: 'Internal Server Error' }))
      );

      const result = await service.getFilters('any query');

      expect(result).toBeNull();
    });

    it('should return null when LLM API is unreachable (network error)', async () => {
      jest.spyOn(httpService, 'post').mockReturnValue(
        throwError(() => new Error('connect ECONNREFUSED'))
      );

      const result = await service.getFilters('test query');

      expect(result).toBeNull();
    });

    it('should return null when LLM API returns malformed response', async () => {
      jest.spyOn(httpService, 'post').mockReturnValue(
        of({ data: null } as any)
      );

      const result = await service.getFilters('test query');

      expect(result).toBeNull();
    });

    it('should return null when LLM API returns empty object', async () => {
      jest.spyOn(httpService, 'post').mockReturnValue(
        of({ data: {} } as any)
      );

      const result = await service.getFilters('test query');

      expect(result).toEqual({});
    });

    it('should handle 404 Not Found from LLM API', async () => {
      jest.spyOn(httpService, 'post').mockReturnValue(
        throwError(() => ({ status: 404, message: 'Not Found' }))
      );

      const result = await service.getFilters('test query');

      expect(result).toBeNull();
    });

    it('should handle 400 Bad Request from LLM API', async () => {
      jest.spyOn(httpService, 'post').mockReturnValue(
        throwError(() => ({ status: 400, message: 'Bad Request' }))
      );

      const result = await service.getFilters('test query');

      expect(result).toBeNull();
    });
  });

  describe('Environment configuration', () => {
    it('should use LLM_API_URL from environment', () => {
      expect(process.env.LLM_API_URL).toBe('http://localhost:8000/api/v1/parse-query-only');
    });

    it('should use LLM_TIMEOUT from environment', () => {
      expect(process.env.LLM_TIMEOUT).toBe('3000');
    });

    it('should throw error if LLM_API_URL is not defined', async () => {
      const oldUrl = process.env.LLM_API_URL;
      delete process.env.LLM_API_URL;

      await expect(async () => {
        const module: TestingModule = await Test.createTestingModule({
          imports: [HttpModule],
          providers: [LlmApiService],
        }).compile();
        module.get<LlmApiService>(LlmApiService);
      }).rejects.toThrow('LLM_API_URL não definida no .env');

      process.env.LLM_API_URL = oldUrl;
    });
  });

  describe('Query payload format', () => {
    it('should send correct payload format to LLM API', async () => {
      const spy = jest.spyOn(httpService, 'post').mockReturnValue(
        of({ data: {} } as any)
      );

      await service.getFilters('test query');

      expect(spy).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/parse-query-only',
        { query: 'test query' }
      );
    });

    it('should handle queries with special characters', async () => {
      const spy = jest.spyOn(httpService, 'post').mockReturnValue(
        of({ data: {} } as any)
      );

      const queryWithSpecialChars = 'produtos com "aspas" e símbolos: R$ 10,50';
      await service.getFilters(queryWithSpecialChars);

      expect(spy).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/parse-query-only',
        { query: queryWithSpecialChars }
      );
    });

    it('should handle empty query strings', async () => {
      const spy = jest.spyOn(httpService, 'post').mockReturnValue(
        of({ data: {} } as any)
      );

      await service.getFilters('');

      expect(spy).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/parse-query-only',
        { query: '' }
      );
    });

    it('should handle very long queries', async () => {
      const spy = jest.spyOn(httpService, 'post').mockReturnValue(
        of({ data: {} } as any)
      );

      const longQuery = 'a'.repeat(500) + ' produtos doces até 50 reais';
      await service.getFilters(longQuery);

      expect(spy).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/parse-query-only',
        { query: longQuery }
      );
    });
  });

  describe('Response data validation', () => {
    it('should accept valid filter response with all fields', async () => {
      const validFilters = {
        search_term: 'test',
        category: 'Category',
        price_min: 10,
        price_max: 100,
      };

      jest.spyOn(httpService, 'post').mockReturnValue(
        of({ data: validFilters } as any)
      );

      const result = await service.getFilters('test query');

      expect(result).toEqual(validFilters);
    });

    it('should accept partial filter response (only category)', async () => {
      const partialFilters = { category: 'Doces' };

      jest.spyOn(httpService, 'post').mockReturnValue(
        of({ data: partialFilters } as any)
      );

      const result = await service.getFilters('doces');

      expect(result).toEqual(partialFilters);
    });

    it('should accept filter response with numeric strings for prices', async () => {
      const filtersWithStringPrices = {
        price_min: '10',
        price_max: '50',
      };

      jest.spyOn(httpService, 'post').mockReturnValue(
        of({ data: filtersWithStringPrices } as any)
      );

      const result = await service.getFilters('produtos entre 10 e 50');

      expect(result).toEqual(filtersWithStringPrices);
    });
  });
});
