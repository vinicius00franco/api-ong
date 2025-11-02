import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '../middleware/authMiddleware';
import { ZodValidationPipe } from '../lib/zodValidationPipe';
import { OrderService } from './orderService';
import { CreateOrderSchema, CreateOrderInput } from './orderSchemas';
import { OrderResponse } from './orderTypes';
import { HandleErrors } from '../lib/handleErrors';
import { ApiResponse } from '../lib/apiResponse';

@Controller('orders')
@UseGuards(AuthGuard)
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Post()
  @HandleErrors()
  async create(
    @Body(new ZodValidationPipe(CreateOrderSchema)) createOrderInput: CreateOrderInput,
    @Request() req: any,
  ): Promise<ApiResponse<OrderResponse>> {
    const result = await this.orderService.create(createOrderInput, req.organizationId);
    return ApiResponse.success(result);
  }

  @Get()
  @HandleErrors()
  async findAll(@Request() req: any): Promise<ApiResponse<OrderResponse[]>> {
    const result = await this.orderService.findAll(req.organizationId);
    return ApiResponse.success(result);
  }

  @Get(':id')
  @HandleErrors()
  async findById(@Param('id') id: string, @Request() req: any): Promise<ApiResponse<OrderResponse>> {
    const result = await this.orderService.findById(parseInt(id), req.organizationId);
    return ApiResponse.success(result);
  }
}