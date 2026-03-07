export interface ForgotPasswordPasswordReqDT {
  email: string;
}
export interface ResetPasswordPasswordReqDT {
  email: string;
  otp: number;
  newPassword: string;
}

export interface VerifyOTPReqDT {
  email: string;
  code: number;
}
