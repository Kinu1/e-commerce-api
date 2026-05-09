import { Request } from 'express';
import { Role } from '@prisma/client';

export type AuthUser = {
  id: string;
  email: string;
  role: Role;
};

export type AuthenticatedRequest = Request & {
  user: AuthUser;
};
