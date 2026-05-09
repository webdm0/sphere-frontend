export interface AuthResponse {
  accessToken: string;
}

export interface DemoSessionResponse extends AuthResponse {
  demoExpiresAtUtc: string;
}

export interface ResendConfirmationRequest {
  email: string;
}
