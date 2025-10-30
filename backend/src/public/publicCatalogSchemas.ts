import { z } from 'zod';

export const publicCatalogQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  category: z.string().optional(),
  price_min: z.coerce.number().nonnegative().optional(),
  price_max: z.coerce.number().nonnegative().optional(),
});

export type PublicCatalogQueryDto = z.infer<typeof publicCatalogQuerySchema>;
