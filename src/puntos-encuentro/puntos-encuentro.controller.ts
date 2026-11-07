import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PuntosEncuentroService } from './puntos-encuentro.service.js';

// Cualquier usuario autenticado ve los puntos activos (mapa del front).
@ApiTags('Puntos de EcoReciclaje')
@ApiBearerAuth()
@Controller('puntos-encuentro')
export class PuntosEncuentroController {
  constructor(private readonly puntosService: PuntosEncuentroService) {}

  @Get()
  @ApiOperation({ summary: 'Puntos de encuentro activos' })
  listarActivos() {
    return this.puntosService.listarActivos();
  }
}
