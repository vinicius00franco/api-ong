import { Test, TestingModule } from '@nestjs/testing';
import { LlmApiService } from '../../search/llmApiService';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';

describe('LlmApiService', () => {
  let service: LlmApiService;
  let http: jest.Mocked<HttpService>;

  const OLD_ENV = process.env;
  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...OLD_ENV, LLM_API_URL: 'http://llm/api', LLM_TIMEOUT: '3000' };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmApiService,
        {
          provide: HttpService,
          useValue: { post: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(LlmApiService);
    http = module.get(HttpService) as any;
  });

  afterEach(() => {
    process.env = OLD_ENV;
    jest.clearAllMocks();
  });

  it('should return filters on success', async () => {
    http.post.mockReturnValue(of({ data: { category: 'Doces', price_max: 50 } } as any));

    const result = await service.getFilters('doces até 50');
    expect(http.post).toHaveBeenCalledWith('http://llm/api', { query: 'doces até 50' });
    expect(result).toEqual({ category: 'Doces', price_max: 50 });
  });

  it('should return null on error/timeout', async () => {
    http.post.mockReturnValue(throwError(() => new Error('timeout')) as any);

    const result = await service.getFilters('qualquer');
    expect(result).toBeNull();
  });

  it('should return null when response data is missing', async () => {
    http.post.mockReturnValue(of({ data: null } as any));

    const result = await service.getFilters('teste sem data');
    expect(result).toBeNull();
  });

  it('should return null when response is null', async () => {
    http.post.mockReturnValue(of(null as any));

    const result = await service.getFilters('teste resposta null');
    expect(result).toBeNull();
  });

  it('should handle network errors gracefully', async () => {
    http.post.mockReturnValue(throwError(() => new Error('Network error')) as any);

    const result = await service.getFilters('network fail');
    expect(result).toBeNull();
  });

  it('should handle unexpected exceptions', async () => {
    http.post.mockReturnValue(throwError(() => new Error('Unexpected sync error')));

    const result = await service.getFilters('sync error');
    expect(result).toBeNull();
  });
});
