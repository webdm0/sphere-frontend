type JwtPayload = {
  id?: string;
  username?: string;
  email?: string;
  is_demo?: boolean | string;
  isDemo?: boolean | string;
  IsDemo?: boolean | string;
};

const decodeBase64 = (value: string) => {
  if (typeof atob === "function") {
    return atob(value);
  }
  return Buffer.from(value, "base64").toString("binary");
};

export const parseJwt = (token: string): JwtPayload | null => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const decoded = decodeBase64(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
};
