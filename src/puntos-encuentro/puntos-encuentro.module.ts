import { Module } from '@nestjs/common';
import { PuntosEncuentroController } from './puntos-encuentro.controller.js';
import { PuntosEncuentroService } from './puntos-encuentro.service.js';

@Module({
  controllers: [PuntosEncuentroController],
  providers: [PuntosEncuentroService],
  exports: [PuntosEncuentroService],
})
export class PuntosEncuentroModule {}
