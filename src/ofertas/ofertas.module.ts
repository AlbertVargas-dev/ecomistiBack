import { Module } from '@nestjs/common';
import { OfertasController } from './ofertas.controller.js';
import { OfertasService } from './ofertas.service.js';

@Module({
  controllers: [OfertasController],
  providers: [OfertasService],
  exports: [OfertasService],
})
export class OfertasModule {}
