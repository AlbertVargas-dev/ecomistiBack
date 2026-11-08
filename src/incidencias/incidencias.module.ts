import { Module } from '@nestjs/common';
import { IncidenciasController } from './incidencias.controller.js';
import { IncidenciasService } from './incidencias.service.js';

@Module({
  controllers: [IncidenciasController],
  providers: [IncidenciasService],
})
export class IncidenciasModule {}
