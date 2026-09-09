export class ApiResponse<T> {
  code: number;
  message: string;
  data: T;

  constructor(code: number, message: string, data: T) {
    this.code = code;
    this.message = message;
    this.data = data;
  }

  static success<T>(message: string, data: T): ApiResponse<T> {
    return new ApiResponse(200, message, data);
  }

  static error(code: number, message: string): ApiResponse<null> {
    return new ApiResponse(code, message, null);
  }
}
