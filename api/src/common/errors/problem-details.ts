/** A single failed rule on a request field. */
export interface FieldError {
  field?: string;
  message: string;
}

/**
 * The body of every error response, following RFC 9457 "Problem Details"
 * (served as `application/problem+json`).
 */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  errors?: FieldError[];
}
