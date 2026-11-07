import { Module } from '@nestjs/common';
import { VouchersModule } from '../vouchers/vouchers.module.js';
import { RentasController } from './rentas.controller.js';

@Module({
  imports: [VouchersModule],
  controllers: [RentasController],
})
export class RentasModule {}
