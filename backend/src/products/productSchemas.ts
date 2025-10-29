import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  price: z.number().positive(),
  category: z.string().min(1),
  image_url: z.string().url(),
  stock_qty: z.number().int().min(0),
  weight_grams: z.number().int().min(0),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  price: z.number().positive().optional(),
  category: z.string().min(1).optional(),
  image_url: z.string().url().optional(),
  stock_qty: z.number().int().min(0).optional(),
  weight_grams: z.number().int().min(0).optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;