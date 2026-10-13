import { BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { FieldError } from './problem-details';

/**
 * Used as the ValidationPipe's `exceptionFactory`, so validation failures keep
 * the field each message belongs to instead of a flat list of strings.
 */
export function validationExceptionFactory(
  errors: ValidationError[],
): BadRequestException {
  return new BadRequestException({
    message: 'The request is invalid.',
    errors: flatten(errors),
  });
}

// Nested DTOs report their failures as children; flatten them to dotted paths
// such as "address.city".
function flatten(errors: ValidationError[], parent?: string): FieldError[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const own = Object.values(error.constraints ?? {}).map((message) => ({
      field,
      message,
    }));
    return [...own, ...flatten(error.children ?? [], field)];
  });
}
