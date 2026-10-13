import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { STATUS_CODES } from 'node:http';
import { Prisma } from '../../generated/prisma/client';
import { FieldError, ProblemDetails } from './problem-details';

interface ResolvedError {
  status: number;
  detail: string;
  errors?: FieldError[];
}

/**
 * Turns every exception into a Problem Details response, so clients only ever
 * have to parse one error shape.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const { status, detail, errors } = this.resolve(exception);

    // Server errors are our bugs: log everything, but never send it.
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.originalUrl}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ProblemDetails = {
      type: 'about:blank',
      title: STATUS_CODES[status] ?? 'Error',
      status,
      detail,
      instance: request.originalUrl,
      ...(errors && { errors }),
    };

    response.status(status).type('application/problem+json').json(body);
  }

  private resolve(exception: unknown): ResolvedError {
    if (exception instanceof HttpException) {
      return this.fromHttpException(exception);
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return {
          status: HttpStatus.CONFLICT,
          detail: 'A record with this value already exists.',
        };
      }
      if (exception.code === 'P2025') {
        return {
          status: HttpStatus.NOT_FOUND,
          detail: 'The requested record was not found.',
        };
      }
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: 'An unexpected error occurred.',
    };
  }

  private fromHttpException(exception: HttpException): ResolvedError {
    const status = exception.getStatus();
    const body = exception.getResponse();

    if (typeof body === 'string') {
      return { status, detail: body };
    }

    const { message, errors } = body as {
      message?: unknown;
      errors?: FieldError[];
    };

    // From validationExceptionFactory: per-field errors.
    if (Array.isArray(errors)) {
      return {
        status,
        detail: typeof message === 'string' ? message : exception.message,
        errors,
      };
    }

    // Nest's default validation shape: a plain list of messages.
    if (Array.isArray(message)) {
      return {
        status,
        detail: 'The request is invalid.',
        errors: message.map((m) => ({ message: String(m) })),
      };
    }

    return {
      status,
      detail: typeof message === 'string' ? message : exception.message,
    };
  }
}
