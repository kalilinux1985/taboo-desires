export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "BAD_REQUEST"
  | "CONFLICT"
  | "INVALID_ARGS"
  | "INTERNAL";

export type ErrorData = { code: ErrorCode; message: string };

/**
 * An expected, user-facing failure. Its `data` is sent to the browser as-is,
 * so the message should be safe to show. Anything else that is thrown is
 * logged on the server and reported as a generic error.
 */
export class AppError extends Error {
  readonly data: ErrorData;
  constructor(data: ErrorData) {
    super(data.message);
    this.name = "AppError";
    this.data = data;
  }
}

export const HTTP_STATUS: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  BAD_REQUEST: 400,
  CONFLICT: 409,
  INVALID_ARGS: 400,
  INTERNAL: 500,
};
