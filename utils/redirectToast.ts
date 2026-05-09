export const BOARD_REDIRECT_TOAST_KEY = "board-redirect-toast";

export type RedirectToastPayload = {
  message: string;
  note?: string;
};

export const writeRedirectToast = (payload: RedirectToastPayload) => {
  try {
    sessionStorage.setItem(BOARD_REDIRECT_TOAST_KEY, JSON.stringify(payload));
  } catch {
  }
};

export const consumeRedirectToast = (): RedirectToastPayload | null => {
  try {
    const raw = sessionStorage.getItem(BOARD_REDIRECT_TOAST_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(BOARD_REDIRECT_TOAST_KEY);
    return JSON.parse(raw) as RedirectToastPayload;
  } catch {
    return null;
  }
};
