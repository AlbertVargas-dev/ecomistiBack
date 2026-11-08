import { Module } from '@nestjs/common';
import { UrbanizacionesController } from './urbanizaciones.controller.js';

@Module({ controllers: [UrbanizacionesController] })
export class UrbanizacionesModule {}
