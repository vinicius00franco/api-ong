import { Test, TestingModule } from '@nestjs/testing';
import { SearchController } from '../../search/searchController';
import { SearchService } from '../../search/searchService';
import { ApiResponse } from '../../lib/apiResponse';

describe('SearchController', () => {
  let controller: SearchController;
  let service: jest.Mocked<SearchService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        { provide: SearchService, useValue: { searchProducts: jest.fn() } },
      ],
    }).compile();

    controller = module.get(SearchController);
    service = module.get(SearchService) as any;
  });

  afterEach(() => jest.clearAllMocks());

  it('should return empty response when q is empty', async () => {
    const result = await controller.search({ q: '' });
    expect(result).toEqual(
      ApiResponse.success({
        interpretation: 'Nenhum termo de busca fornecido.',
        ai_used: false,
        fallback_applied: false,
        data: [],
      }),
    );
    expect(service.searchProducts).not.toHaveBeenCalled();
  });

  it('should delegate to service and wrap response', async () => {
    const payload = {
      interpretation: "Buscando por: Termo='bolo', Categoria='Doces'",
      ai_used: true,
      fallback_applied: false,
      data: [],
    };
    service.searchProducts.mockResolvedValue(payload as any);

    const out = await controller.search({ q: 'bolo' });
    expect(service.searchProducts).toHaveBeenCalledWith('bolo');
    expect(out).toEqual(ApiResponse.success(payload));
  });
});
