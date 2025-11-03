import { z } from 'zod';

export const CreateOrderItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive(),
});

export const CreateOrderSchema = z.object({
  customerId: z.number().int().positive().optional(),
  items: z.array(CreateOrderItemSchema).min(1),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type CreateOrderItemInput = z.infer<typeof CreateOrderItemSchema>;