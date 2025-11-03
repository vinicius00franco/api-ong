import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, of, timeout, catchError } from 'rxjs';
import { IAIFilters } from './searchTypes';

@Injectable()
export class LlmApiService {
  private readonly logger = new Logger(LlmApiService.name);
  private readonly LLM_API_URL = process.env.LLM_API_URL;
  private readonly LLM_TIMEOUT = parseInt(process.env.LLM_TIMEOUT || '2000', 10);

  constructor(private readonly httpService: HttpService) {
    if (!this.LLM_API_URL) {
      throw new Error('LLM_API_URL não definida no .env');
    }
  }

  async getFilters(query: string): Promise<IAIFilters | null> {
    try {
      this.logger.log(`Chamando LLM API para: "${query.substring(0, 50)}..."`);
      const response$ = this.httpService
        .post(this.LLM_API_URL as string, { query })
        .pipe(
          timeout(this.LLM_TIMEOUT),
          catchError((error) => {
            this.logger.warn(`LLM API falhou ou excedeu timeout: ${error?.message || error}`);
            return of(null as any);
          }),
        );

      const response: any = await firstValueFrom(response$);
      if (!response || !response.data) return null;
      this.logger.log(`LLM retornou filtros: ${JSON.stringify(response.data)}`);
      return response.data as IAIFilters;
    } catch (e: any) {
      this.logger.error(`Erro inesperado ao chamar LLM API: ${e?.message || e}`);
      return null;
    }
  }
}
