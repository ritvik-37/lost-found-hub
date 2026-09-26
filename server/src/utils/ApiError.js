/** An error with an HTTP status and optional per-field messages ({ field: message }). */
export class ApiError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }

  static badRequest(message, errors) { return new ApiError(400, message, errors); }
  static unauthorized(message = 'Please sign in to continue.') { return new ApiError(401, message); }
  static forbidden(message = 'You do not have permission to do that.') { return new ApiError(403, message); }
  static notFound(message = 'Not found.') { return new ApiError(404, message); }
  static conflict(message, errors) { return new ApiError(409, message, errors); }
}
