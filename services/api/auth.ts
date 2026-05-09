import { post, get, requestAccessTokenRefresh } from '@/services/api/request';
import { AuthResponse, DemoSessionResponse, ResendConfirmationRequest } from '@/types';

export const loginUser = (identifier: string, password: string): Promise<AuthResponse> => {
  return post<AuthResponse>(`/api/auth/login`, { identifier, password });
};

export const registerUser = (username: string, email: string, password: string): Promise<AuthResponse> => {
  return post<AuthResponse>(`/api/auth/register`, { username, email, password });
};

export const resendConfirmation = (email: string): Promise<ResendConfirmationRequest> => {
  return post<ResendConfirmationRequest>(`/api/auth/resend-confirmation`, { email });
};

export const getConfirmEmail = (token: string): Promise<AuthResponse> => {
  const encodedToken = encodeURIComponent(token);
  return get<AuthResponse>(`/api/auth/confirm-email?token=${encodedToken}`);
};

export const refreshAccessToken = async (): Promise<AuthResponse | null> => {
  try {
    const accessToken = await requestAccessTokenRefresh();
    return { accessToken };
  } catch {
    return null;
  }
};

export const createDemoSession = (): Promise<DemoSessionResponse> => {
  return post<DemoSessionResponse>(`/api/auth/demo`, {});
};

export const logoutUser = (): Promise<void> => {
  return post<void>(`/api/auth/logout`);
};
