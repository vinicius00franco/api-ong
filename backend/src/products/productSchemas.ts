import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  price: z.number().positive(),
  categoryId: z.number().int().positive(),
  imageUrl: z.string().url(),
  stockQty: z.number().int().min(0),
  weightGrams: z.number().int().min(0),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  price: z.number().positive().optional(),
  categoryId: z.number().int().positive().optional(),
  imageUrl: z.string().url().optional(),
  stockQty: z.number().int().min(0).optional(),
  weightGrams: z.number().int().min(0).optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;