export type ApiEnvelope<T> = {
  statusCode: number
  payload?: {
    message?: string
    data?: T
  }
  error?: any
}
