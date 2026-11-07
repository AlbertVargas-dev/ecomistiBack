import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service.js';
import { Public } from '../common/decorators/public.decorator.js';

/**
 * Urbanizaciones para el registro del representante legal:
 * el front lista las existentes o crea una nueva al registrarse.
 */
@ApiTags('Urbanizaciones')
@ApiBearerAuth()
@Controller('urbanizaciones')
export class UrbanizacionesController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Listar urbanizaciones (para el registro)' })
  listar() {
    return this.prisma.urbanizacion.findMany({
      orderBy: { nombre: 'asc' },
      select: { id: true, nombre: true, direccion: true, distrito: true },
    });
  }
}
