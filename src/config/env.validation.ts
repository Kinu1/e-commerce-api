import type { StringValue } from 'ms';

type EnvShape = {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  DATABASE_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: StringValue;
  JWT_REFRESH_EXPIRES_IN: StringValue;
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

const parseNodeEnv = (value: unknown): EnvShape['NODE_ENV'] => {
  const nodeEnv = typeof value === 'string' ? value : 'development';
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error('NODE_ENV must be development, test or production');
  }
  return nodeEnv as EnvShape['NODE_ENV'];
};

const parseInteger = (config: Record<string, unknown>, key: string, fallback: number) => {
  const value = Number(config[key] ?? fallback);
  if (!Number.isInteger(value)) {
    throw new Error(`${key} must be an integer`);
  }
  return value;
};

const validateJwtSecret = (key: string, value: string, nodeEnv: EnvShape['NODE_ENV']) => {
  const trimmed = value.trim();

  if (nodeEnv === 'production') {
    if (trimmed.startsWith('change-me') || trimmed.length < 32) {
      throw new Error(`${key} must be a strong production secret`);
    }
  }

  return trimmed;
};

const validateTokenDuration = (key: string, value: unknown, fallback: string) => {
  const duration = typeof value === 'string' ? value.trim() : fallback;
  if (!/^\d+[mhd]$/.test(duration)) {
    throw new Error(`${key} must use a duration like 15m, 12h or 7d`);
  }
  return duration as StringValue;
};

const validateDatabaseUrl = (value: string, nodeEnv: EnvShape['NODE_ENV']) => {
  const trimmed = value.trim();
  if (!trimmed.startsWith('postgresql://') && !trimmed.startsWith('postgres://')) {
    throw new Error('DATABASE_URL must be a PostgreSQL connection string');
  }

  if (nodeEnv === 'production' && /\[[A-Z0-9_]+\]/i.test(trimmed)) {
    throw new Error('DATABASE_URL must not contain placeholder values in production');
  }

  return trimmed;
};

const validateCorsOrigin = (value: string | undefined, nodeEnv: EnvShape['NODE_ENV']) => {
  if (!value) {
    if (nodeEnv === 'production') {
      throw new Error('CORS_ORIGIN is required in production');
    }
    return undefined;
  }

  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (!origins.length) {
    throw new Error('CORS_ORIGIN must include at least one origin');
  }

  if (nodeEnv === 'production') {
    for (const origin of origins) {
      if (origin === '*') {
        throw new Error('CORS_ORIGIN cannot be wildcard in production');
      }

      const parsed = new URL(origin);
      if (!['https:', 'http:'].includes(parsed.protocol)) {
        throw new Error('CORS_ORIGIN must use http or https origins');
      }
    }
  }

  return origins.join(',');
};

export function validateEnv(config: Record<string, unknown>): EnvShape {
  const nodeEnv = parseNodeEnv(config.NODE_ENV);
  const port = parseInteger(config, 'PORT', 3000);
  const bcryptRounds = parseInteger(config, 'BCRYPT_ROUNDS', 10);
  const corsOrigin = validateCorsOrigin(
    typeof config.CORS_ORIGIN === 'string' ? config.CORS_ORIGIN : undefined,
    nodeEnv
  );
  const databaseUrl = validateDatabaseUrl(required(config, 'DATABASE_URL'), nodeEnv);
  const jwtAccessSecret = validateJwtSecret(
    'JWT_ACCESS_SECRET',
    required(config, 'JWT_ACCESS_SECRET'),
    nodeEnv
  );
  const jwtRefreshSecret = validateJwtSecret(
    'JWT_REFRESH_SECRET',
    required(config, 'JWT_REFRESH_SECRET'),
    nodeEnv
  );

  if (port < 1 || port > 65535) {
    throw new Error('PORT must be between 1 and 65535');
  }

  if (bcryptRounds < 4 || bcryptRounds > 15) {
    throw new Error('BCRYPT_ROUNDS must be between 4 and 15');
  }

  if (nodeEnv === 'production' && bcryptRounds < 10) {
    throw new Error('BCRYPT_ROUNDS must be at least 10 in production');
  }

  if (nodeEnv === 'production' && jwtAccessSecret === jwtRefreshSecret) {
    throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different in production');
  }

  return {
    NODE_ENV: nodeEnv,
    PORT: port,
    DATABASE_URL: databaseUrl,
    JWT_ACCESS_SECRET: jwtAccessSecret,
    JWT_REFRESH_SECRET: jwtRefreshSecret,
    JWT_ACCESS_EXPIRES_IN: validateTokenDuration(
      'JWT_ACCESS_EXPIRES_IN',
      config.JWT_ACCESS_EXPIRES_IN,
      '15m'
    ),
    JWT_REFRESH_EXPIRES_IN: validateTokenDuration(
      'JWT_REFRESH_EXPIRES_IN',
      config.JWT_REFRESH_EXPIRES_IN,
      '7d'
    ),
    BCRYPT_ROUNDS: bcryptRounds,
    CORS_ORIGIN: corsOrigin
  };
}
