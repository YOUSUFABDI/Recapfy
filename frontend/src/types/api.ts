export type ApiResponse<T> = {
  statusCode: number;
  payload: {
    message?: string;
    data: T | null;
  };
  error?: any | null;
};
