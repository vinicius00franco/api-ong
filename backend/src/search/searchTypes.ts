import { PublicProduct } from '../public/publicCatalogTypes';

// Espelha o schema Pydantic `FiltrosBusca` do llm-api
export interface IAIFilters {
  search_term?: string;
  category?: string;
  price_min?: number;
  price_max?: number;
}

// Resposta padronizada da busca inteligente
export interface ISearchResponse {
  interpretation: string;
  ai_used: boolean;
  fallback_applied: boolean;
  data: PublicProduct[];
}
