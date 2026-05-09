type EnvShape = {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  BCRYPT_ROUNDS: number;
  CORS_ORIGIN?: string;
};

const required = (config: Record<string, unknown>, key: string) => {
  const value = config[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${key} is required`);
  }
  return value;
};

export function validateEnv(config: Record<string, unknown>): EnvShape {
  return {
    NODE_ENV: (config.NODE_ENV as string) ?? 'development',
    PORT: Number(config.PORT ?? 3000),
    DATABASE_URL: required(config, 'DATABASE_URL'),
    JWT_ACCESS_SECRET: required(config, 'JWT_ACCESS_SECRET'),
    JWT_REFRESH_SECRET: required(config, 'JWT_REFRESH_SECRET'),
    JWT_ACCESS_EXPIRES_IN: (config.JWT_ACCESS_EXPIRES_IN as string) ?? '15m',
    JWT_REFRESH_EXPIRES_IN: (config.JWT_REFRESH_EXPIRES_IN as string) ?? '7d',
    BCRYPT_ROUNDS: Number(config.BCRYPT_ROUNDS ?? 10),
    CORS_ORIGIN: config.CORS_ORIGIN as string | undefined
  };
}
