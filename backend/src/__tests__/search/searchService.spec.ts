import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from '../../search/searchService';
import { SearchRepository } from '../../search/searchRepository';
import { LlmApiService } from '../../search/llmApiService';

describe('SearchService', () => {
  let service: SearchService;
  let repo: jest.Mocked<SearchRepository>;
  let llm: jest.Mocked<LlmApiService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: SearchRepository, useValue: { findByText: jest.fn(), findByFilters: jest.fn() } },
        { provide: LlmApiService, useValue: { getFilters: jest.fn() } },
      ],
    }).compile();

    service = module.get(SearchService);
    repo = module.get(SearchRepository) as any;
    llm = module.get(LlmApiService) as any;
  });

  afterEach(() => jest.clearAllMocks());

  it('should fallback when LLM returns null', async () => {
    llm.getFilters.mockResolvedValue(null);
    const products = [
      { id: 1, name: 'Produto A', description: 'Desc', price: 10, category: 'Doces', image_url: '', stock_qty: 1, weight_grams: 100, organization_id: 1 },
    ];
    repo.findByText.mockResolvedValue(products as any);

    const out = await service.searchProducts('doces até 50');
    expect(repo.findByText).toHaveBeenCalledWith('doces até 50');
    expect(out).toEqual({
      interpretation: 'Buscando por texto: "doces até 50"',
      ai_used: false,
      fallback_applied: true,
      data: products as any,
    });
  });

  it('should fallback when filters are insufficient (only search_term)', async () => {
    llm.getFilters.mockResolvedValue({ search_term: 'bolo' });
    const products = [
      { id: 2, name: 'Bolo', description: 'Chocolate', price: 20, category: 'Doces', image_url: '', stock_qty: 5, weight_grams: 200, organization_id: 1 },
    ];
    repo.findByText.mockResolvedValue(products as any);

    const out = await service.searchProducts('bolo');
    expect(repo.findByText).toHaveBeenCalledWith('bolo');
    expect(out.ai_used).toBe(false);
    expect(out.fallback_applied).toBe(true);
  });

  it('should use smart search when filters include price or category', async () => {
    const filters = { search_term: 'suco', category: 'Bebidas', price_max: 30 };
    llm.getFilters.mockResolvedValue(filters);
    const products = [
      { id: 3, name: 'Suco', description: 'Natural', price: 15, category: 'Bebidas', image_url: '', stock_qty: 10, weight_grams: 500, organization_id: 2 },
    ];
    repo.findByFilters.mockResolvedValue(products as any);

    const out = await service.searchProducts('suco até 30');
    expect(repo.findByFilters).toHaveBeenCalledWith(filters);
    expect(out.ai_used).toBe(true);
    expect(out.fallback_applied).toBe(false);
    expect(out.interpretation).toContain("Categoria='Bebidas'");
    expect(out.interpretation).toContain("Preço Máx.='30'");
  });
});
