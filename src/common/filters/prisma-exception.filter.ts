import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

/**
 * Filtro global de excepciones (OWASP A02:2025 / A05:2025):
 * - Traduce errores de Prisma (P2002->409, P2025->404, P2003->400) sin exponer
 *   estructura SQL, nombres internos de tablas ni stack traces.
 * - Captura cualquier error inesperado y responde con un JSON limpio sin filtrar
 *   trazas de código ni versiones del servidor.
 */
@Catch()
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === 'object' && response !== null) {
        const body = response as Record<string, unknown>;
        res.status(status).json({
          statusCode: status,
          message: body.message ?? exception.message,
          error: body.error ?? HttpStatus[status] ?? 'Error',
        });
        return;
      }
      res.status(status).json({
        statusCode: status,
        message: String(response),
        error: HttpStatus[status] ?? 'Error',
      });
      return;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      let status = HttpStatus.INTERNAL_SERVER_ERROR;
      let message = 'Error al procesar la operación';
      let error = 'Internal Server Error';

      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          message = 'Ya existe un registro con ese valor único';
          error = 'Conflict';
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'Registro no encontrado';
          error = 'Not Found';
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          message = 'Referencia a un registro inexistente';
          error = 'Bad Request';
          break;
      }

      res.status(status).json({ statusCode: status, message, error });
      return;
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Datos de consulta inválidos',
        error: 'Bad Request',
      });
      return;
    }

    // Errores de body-parser (ej. payload > 100kb o JSON malformado)
    if (
      typeof exception === 'object' &&
      exception !== null &&
      'status' in exception &&
      typeof (exception as { status: unknown }).status === 'number'
    ) {
      const status = (exception as { status: number }).status;
      const message =
        status === HttpStatus.PAYLOAD_TOO_LARGE
          ? 'El tamaño de la petición excede el límite permitido'
          : 'Formato de petición inválido';
      res.status(status).json({
        statusCode: status,
        message,
        error: HttpStatus[status] ?? 'Error',
      });
      return;
    }

    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Error interno del servidor',
      error: 'Internal Server Error',
    });
  }
}
