import { ErrorCode } from "../constants/error-codes";

export class AppError extends Error {
  public statusCode: number;
  public errorCode: ErrorCode;
  public details?: any;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    details?: any,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(
    message: string,
    errorCode: ErrorCode = ErrorCode.BAD_REQUEST,
    details?: any
  ): AppError {
    return new AppError(message, 400, errorCode, details);
  }

  static unauthorized(
    message: string = "Unauthorized",
    errorCode: ErrorCode = ErrorCode.UNAUTHORIZED,
    details?: any
  ): AppError {
    return new AppError(message, 401, errorCode, details);
  }

  static forbidden(
    message: string = "Forbidden",
    errorCode: ErrorCode = ErrorCode.FORBIDDEN,
    details?: any
  ): AppError {
    return new AppError(message, 403, errorCode, details);
  }

  static tooManyRequests(
    message: string = "Too many requests",
    errorCode: ErrorCode = ErrorCode.TOO_MANY_REQUESTS,
    details?: any
  ): AppError {
    return new AppError(message, 429, errorCode, details);
  }

  static notFound(
    message: string = "Resource not found",
    errorCode: ErrorCode = ErrorCode.NOT_FOUND,
    details?: any
  ): AppError {
    return new AppError(message, 404, errorCode, details);
  }

  static conflict(
    message: string,
    errorCode: ErrorCode = ErrorCode.CONFLICT,
    details?: any
  ): AppError {
    return new AppError(message, 409, errorCode, details);
  }

  static validationError(message: string, details?: any): AppError {
    return new AppError(message, 422, ErrorCode.VALIDATION_ERROR, details);
  }

  static internal(
    message: string = "Internal server error",
    errorCode: ErrorCode = ErrorCode.INTERNAL_ERROR,
    details?: any
  ): AppError {
    return new AppError(message, 500, errorCode, details, true);
  }
}
