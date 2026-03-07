import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  constructor(private reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const response = context.switchToHttp().getResponse();
    const customMessage = this.reflector.get<string>(
      'customMessage',
      context.getHandler(),
    );

    return next.handle().pipe(
      map((data) => ({
        statusCode: response.statusCode,
        payload: data ? { message: customMessage || 'Success', data } : null,
        error: null,
      })),
    );
  }
}

interface ApiResponse<T> {
  statusCode: number;
  payload: { message: string; data: T } | null;
  error: { statusCode: number; message: string } | null;
}
