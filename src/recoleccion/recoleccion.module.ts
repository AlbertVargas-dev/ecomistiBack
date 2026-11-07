import { Module } from '@nestjs/common';
import { RecoleccionController } from './recoleccion.controller.js';
import { RecoleccionService } from './recoleccion.service.js';

@Module({
  controllers: [RecoleccionController],
  providers: [RecoleccionService],
})
export class RecoleccionModule {}
