function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

export const appSettings = {
  env: optionalEnv("NODE_ENV", "development"),
  isDev: optionalEnv("NODE_ENV", "development") === "development",
  isProd: process.env.NODE_ENV === "production",
  serviceAccountPath: optionalEnv("SERVICE_ACCOUNT_PATH", ""),

  server: {
    port: parseInt(optionalEnv("PORT", "3000"), 10),
    host: optionalEnv("HOST", "0.0.0.0"),
  },

  logging: {
    level: optionalEnv("LOG_LEVEL", "info"),
  },

  database: {
    url: requireEnv("DATABASE_URL"),
    poolSize: parseInt(optionalEnv("DB_POOL_SIZE", "10"), 10),
    idleTimeout: parseInt(optionalEnv("DB_IDLE_TIMEOUT", "30000"), 10),
    connectionTimeout: parseInt(optionalEnv("DB_CONNECTION_TIMEOUT", "5000"), 10),
  },
} as const;

export type AppSettings = typeof appSettings;
