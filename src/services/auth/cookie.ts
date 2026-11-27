export const sessionCookie = {
  name: "session",
  options: {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  },
};
