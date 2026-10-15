export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, details?: unknown) => new HttpError(400, "BAD_REQUEST", message, details);

export const unauthorized = (message = "Please log in to continue.") => new HttpError(401, "UNAUTHORIZED", message);

export const forbidden = (message = "You don't have permission to do this.") =>
  new HttpError(403, "FORBIDDEN", message);

export const notFound = (resource = "Resource") => new HttpError(404, "NOT_FOUND", `${resource} not found.`);

export const conflict = (message: string) => new HttpError(409, "CONFLICT", message);
