/**
 * Whether the app runs in development (`NODE_ENV === "development"`), the only
 * place hot reload does anything. Read on every call, so tests can stub it.
 */
export const isDevelopment = (): boolean =>
  process.env["NODE_ENV"] === "development";
