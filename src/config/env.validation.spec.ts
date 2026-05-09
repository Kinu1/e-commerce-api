import { validateEnv } from './env.validation';

const baseConfig = {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/ecommerce',
  JWT_ACCESS_SECRET: 'test-access-secret',
  JWT_REFRESH_SECRET: 'test-refresh-secret'
};

describe('validateEnv', () => {
  it('rejects placeholder production JWT secrets', () => {
    expect(() =>
      validateEnv({
        ...baseConfig,
        NODE_ENV: 'production',
        CORS_ORIGIN: 'https://example.com',
        JWT_ACCESS_SECRET: 'change-me-access-secret',
        JWT_REFRESH_SECRET: 'change-me-refresh-secret'
      })
    ).toThrow('JWT_ACCESS_SECRET must be a strong production secret');
  });

  it('requires CORS_ORIGIN in production', () => {
    expect(() =>
      validateEnv({
        ...baseConfig,
        NODE_ENV: 'production',
        JWT_ACCESS_SECRET: 'a'.repeat(32),
        JWT_REFRESH_SECRET: 'b'.repeat(32)
      })
    ).toThrow('CORS_ORIGIN is required in production');
  });

  it('accepts a valid production config', () => {
    expect(
      validateEnv({
        ...baseConfig,
        NODE_ENV: 'production',
        PORT: '3000',
        BCRYPT_ROUNDS: '12',
        CORS_ORIGIN: 'https://example.com',
        JWT_ACCESS_SECRET: 'a'.repeat(32),
        JWT_REFRESH_SECRET: 'b'.repeat(32)
      })
    ).toMatchObject({
      NODE_ENV: 'production',
      PORT: 3000,
      BCRYPT_ROUNDS: 12,
      CORS_ORIGIN: 'https://example.com'
    });
  });

  it('rejects equal production JWT secrets', () => {
    expect(() =>
      validateEnv({
        ...baseConfig,
        NODE_ENV: 'production',
        CORS_ORIGIN: 'https://example.com',
        JWT_ACCESS_SECRET: 'a'.repeat(32),
        JWT_REFRESH_SECRET: 'a'.repeat(32)
      })
    ).toThrow('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different in production');
  });

  it('rejects wildcard CORS with credentials in production', () => {
    expect(() =>
      validateEnv({
        ...baseConfig,
        NODE_ENV: 'production',
        CORS_ORIGIN: '*',
        JWT_ACCESS_SECRET: 'a'.repeat(32),
        JWT_REFRESH_SECRET: 'b'.repeat(32)
      })
    ).toThrow('CORS_ORIGIN cannot be wildcard in production');
  });

  it('rejects unsupported token durations', () => {
    expect(() =>
      validateEnv({
        ...baseConfig,
        JWT_ACCESS_EXPIRES_IN: '900'
      })
    ).toThrow('JWT_ACCESS_EXPIRES_IN must use a duration like 15m, 12h or 7d');
  });
});
