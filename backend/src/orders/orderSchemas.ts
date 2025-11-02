import { z } from 'zod';

export const CreateOrderItemSchema = z.object({
  product_id: z.number().int().positive(),
  quantity: z.number().int().positive(),
});

export const CreateOrderSchema = z.object({
  customer_id: z.number().int().positive().optional(),
  items: z.array(CreateOrderItemSchema).min(1),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type CreateOrderItemInput = z.infer<typeof CreateOrderItemSchema>;