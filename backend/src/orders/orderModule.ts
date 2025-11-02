import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/authModule';
import { ProductModule } from '../products/productModule';
import { OrderController } from './orderController';
import { OrderService } from './orderService';
import { OrderRepository } from './orderRepository';
import { AuthGuard } from '../middleware/authMiddleware';

@Module({
  imports: [AuthModule, ProductModule],
  controllers: [OrderController],
  providers: [
    OrderService,
    {
      provide: OrderRepository,
      useFactory: () => new OrderRepository(),
    },
    AuthGuard,
  ],
})
export class OrderModule {}