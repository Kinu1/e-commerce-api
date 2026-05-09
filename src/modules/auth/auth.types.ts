import { Role } from '@prisma/client';

export type JwtAccessPayload = {
  sub: string;
  email: string;
  role: Role;
};

export type JwtRefreshPayload = JwtAccessPayload & {
  jti: string;
};

export type SafeUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};
