import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, Observable } from 'rxjs';
import { SKIP_RESPONSE_WRAP } from '../decorators/skip-response-wrap.decorator';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_RESPONSE_WRAP, [
      context.getHandler(),
      context.getClass()
    ]);

    if (skip) {
      return next.handle();
    }

    return next.handle().pipe(
      map((value) => {
        if (value === undefined) {
          return undefined;
        }

        if (value && typeof value === 'object' && ('data' in value || 'error' in value)) {
          return value;
        }

        return { data: value };
      })
    );
  }
}
