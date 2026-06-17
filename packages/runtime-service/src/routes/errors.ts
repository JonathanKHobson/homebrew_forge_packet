export class RuntimeRouteError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'RuntimeRouteError';
    this.statusCode = statusCode;
  }
}
