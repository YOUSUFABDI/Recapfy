import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const errorDetails =
      exception instanceof Error && exception.stack ? exception.stack : null;

    console.error('Caught Exception:', exception); // Log the full error

    response.status(status).json({
      statusCode: status,
      data: null,
      error: {
        statusCode: status,
        message:
          typeof message === 'string' ? message : (message as any).message,
        details: errorDetails, // Optional: Include stack trace for debugging
      },
    });
  }
}
