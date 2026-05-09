import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message = typeof body === 'string' ? body : (body as { message?: unknown }).message;

      return response.status(status).json({
        error: {
          code: this.statusToCode(status),
          message: Array.isArray(message) ? 'Request validation failed' : message ?? exception.message,
          details: Array.isArray(message) ? message : undefined
        }
      });
    }

    this.logger.error(exception);
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        code: 'internal_server_error',
        message: 'Internal server error'
      }
    });
  }

  private statusToCode(status: number) {
    const codes: Record<number, string> = {
      400: 'bad_request',
      401: 'unauthorized',
      403: 'forbidden',
      404: 'not_found',
      409: 'conflict',
      422: 'validation_error',
      429: 'too_many_requests'
    };

    return codes[status] ?? 'http_error';
  }
}
