export const AUTH_SESSION_EXPIRED_EVENT = "auth:session-expired";

const AUTH_PAGES = new Set(["/login", "/register", "/confirm-email"]);
const LOGIN_PATH = "/login";

export const notifyAuthSessionExpired = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
};

export const redirectToLoginIfNeeded = () => {
  if (typeof window === "undefined") return;

  const path = window.location.pathname;
  if (AUTH_PAGES.has(path)) return;
  if (path === LOGIN_PATH) return;

  window.location.replace(LOGIN_PATH);
};
