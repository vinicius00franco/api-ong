import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from '../../search/searchService';
import { SearchRepository } from '../../search/searchRepository';
import { LlmApiService } from '../../search/llmApiService';
import { Logger } from '@nestjs/common';

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

  it('should use smart search when filters include only category', async () => {
    const filters = { category: 'Artesanato' };
    llm.getFilters.mockResolvedValue(filters);
    const products = [
      { id: 4, name: 'Colar', description: 'Artesanal', price: 25, category: 'Artesanato', image_url: '', stock_qty: 3, weight_grams: 50, organization_id: 1 },
    ];
    repo.findByFilters.mockResolvedValue(products as any);

    const out = await service.searchProducts('artesanato');
    expect(repo.findByFilters).toHaveBeenCalledWith(filters);
    expect(out.ai_used).toBe(true);
    expect(out.fallback_applied).toBe(false);
    expect(out.interpretation).toContain("Categoria='Artesanato'");
  });

  it('should use smart search when filters include only price_min', async () => {
    const filters = { price_min: 20 };
    llm.getFilters.mockResolvedValue(filters);
    const products = [
      { id: 5, name: 'Produto Caro', description: 'Premium', price: 100, category: 'Diversos', image_url: '', stock_qty: 2, weight_grams: 300, organization_id: 1 },
    ];
    repo.findByFilters.mockResolvedValue(products as any);

    const out = await service.searchProducts('produtos acima de 20 reais');
    expect(repo.findByFilters).toHaveBeenCalledWith(filters);
    expect(out.ai_used).toBe(true);
    expect(out.fallback_applied).toBe(false);
    expect(out.interpretation).toContain("Preço Mín.='20'");
  });

  it('should use smart search when filters include price_min and price_max', async () => {
    const filters = { price_min: 10, price_max: 50 };
    llm.getFilters.mockResolvedValue(filters);
    const products = [
      { id: 6, name: 'Produto Médio', description: 'Intermediário', price: 30, category: 'Geral', image_url: '', stock_qty: 5, weight_grams: 200, organization_id: 2 },
    ];
    repo.findByFilters.mockResolvedValue(products as any);

    const out = await service.searchProducts('produtos entre 10 e 50 reais');
    expect(repo.findByFilters).toHaveBeenCalledWith(filters);
    expect(out.ai_used).toBe(true);
    expect(out.fallback_applied).toBe(false);
    expect(out.interpretation).toContain("Preço Mín.='10'");
    expect(out.interpretation).toContain("Preço Máx.='50'");
  });

  it('should use smart search with all filter fields populated', async () => {
    const filters = { search_term: 'chocolate', category: 'Doces', price_min: 5, price_max: 25 };
    llm.getFilters.mockResolvedValue(filters);
    const products = [
      { id: 7, name: 'Chocolate Especial', description: 'Belga', price: 20, category: 'Doces', image_url: '', stock_qty: 8, weight_grams: 150, organization_id: 1 },
    ];
    repo.findByFilters.mockResolvedValue(products as any);

    const out = await service.searchProducts('chocolate doces entre 5 e 25 reais');
    expect(repo.findByFilters).toHaveBeenCalledWith(filters);
    expect(out.ai_used).toBe(true);
    expect(out.fallback_applied).toBe(false);
    expect(out.interpretation).toContain("Termo='chocolate'");
    expect(out.interpretation).toContain("Categoria='Doces'");
    expect(out.interpretation).toContain("Preço Mín.='5'");
    expect(out.interpretation).toContain("Preço Máx.='25'");
    expect(out.data).toEqual(products);
  });

  it('should fallback when filters have only empty fields', async () => {
    llm.getFilters.mockResolvedValue({});
    const products = [
      { id: 8, name: 'Produto Genérico', description: 'Teste', price: 15, category: 'Geral', image_url: '', stock_qty: 1, weight_grams: 100, organization_id: 1 },
    ];
    repo.findByText.mockResolvedValue(products as any);

    const out = await service.searchProducts('busca vaga');
    expect(repo.findByText).toHaveBeenCalledWith('busca vaga');
    expect(out.ai_used).toBe(false);
    expect(out.fallback_applied).toBe(true);
  });

  describe('Search Logging', () => {
    let loggerSpy: jest.SpyInstance;

    beforeEach(() => {
      loggerSpy = jest.spyOn(service['logger'], 'log').mockImplementation();
    });

    afterEach(() => {
      loggerSpy.mockRestore();
    });

    it('should log search event when AI succeeds', async () => {
      const filters = { search_term: 'chocolate', category: 'Doces', price_max: 30 };
      llm.getFilters.mockResolvedValue(filters);
      const products = [
        { id: 1, name: 'Chocolate', description: 'Dark', price: 20, category: 'Doces', image_url: '', stock_qty: 5, weight_grams: 100, organization_id: 1 },
      ];
      repo.findByFilters.mockResolvedValue(products as any);

      await service.searchProducts('chocolate até 30 reais');

      expect(loggerSpy).toHaveBeenCalledWith(
        JSON.stringify({
          message: 'SmartSearch Event',
          input_text: 'chocolate até 30 reais',
          generated_filters: filters,
          ai_success: true,
          fallback_applied: false,
        })
      );
    });

    it('should log search event when fallback is applied due to AI failure', async () => {
      llm.getFilters.mockResolvedValue(null);
      const products = [
        { id: 2, name: 'Produto', description: 'Desc', price: 10, category: 'Geral', image_url: '', stock_qty: 1, weight_grams: 50, organization_id: 1 },
      ];
      repo.findByText.mockResolvedValue(products as any);

      await service.searchProducts('busca qualquer');

      expect(loggerSpy).toHaveBeenCalledWith(
        JSON.stringify({
          message: 'SmartSearch Event',
          input_text: 'busca qualquer',
          generated_filters: {},
          ai_success: false,
          fallback_applied: true,
        })
      );
    });

    it('should log search event when fallback is applied due to insufficient filters', async () => {
      const insufficientFilters = { search_term: 'apenas termo' };
      llm.getFilters.mockResolvedValue(insufficientFilters);
      const products = [
        { id: 3, name: 'Produto', description: 'Desc', price: 15, category: 'Geral', image_url: '', stock_qty: 2, weight_grams: 75, organization_id: 1 },
      ];
      repo.findByText.mockResolvedValue(products as any);

      await service.searchProducts('apenas termo');

      expect(loggerSpy).toHaveBeenCalledWith(
        JSON.stringify({
          message: 'SmartSearch Event',
          input_text: 'apenas termo',
          generated_filters: insufficientFilters,
          ai_success: true,
          fallback_applied: true,
        })
      );
    });
  });
});
