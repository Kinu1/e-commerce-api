import {
  ConflictException,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import type { StringValue } from 'ms';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtRefreshPayload, SafeUser } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.bcryptRounds);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email,
        passwordHash,
        role: Role.customer
      }
    });

    return this.createSession(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase(), isDeleted: false }
    });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.createSession(user);
  }

  async refresh(refreshToken: string) {
    const payload = await this.verifyRefreshToken(refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: {
        id: payload.jti,
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() }
      },
      include: { user: true }
    });

    if (!stored || stored.user.isDeleted || !(await bcrypt.compare(refreshToken, stored.tokenHash))) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() }
    });

    return this.createSession(stored.user);
  }

  async logout(refreshToken: string) {
    try {
      const payload = await this.verifyRefreshToken(refreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { id: payload.jti, userId: payload.sub, revokedAt: null },
        data: { revokedAt: new Date() }
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async createSession(user: User) {
    const safeUser = this.toSafeUser(user);
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, role: user.role },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.getOrThrow<StringValue>('JWT_ACCESS_EXPIRES_IN')
      }
    );

    const refreshTokenId = randomUUID();
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, role: user.role, jti: refreshTokenId },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.getOrThrow<StringValue>('JWT_REFRESH_EXPIRES_IN')
      }
    );

    await this.prisma.refreshToken.create({
      data: {
        id: refreshTokenId,
        userId: user.id,
        tokenHash: await bcrypt.hash(refreshToken, this.bcryptRounds),
        expiresAt: this.expiresAt(this.config.getOrThrow<string>('JWT_REFRESH_EXPIRES_IN'))
      }
    });

    return { user: safeUser, accessToken, refreshToken };
  }

  private async verifyRefreshToken(refreshToken: string) {
    try {
      return await this.jwt.verifyAsync<JwtRefreshPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET')
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private toSafeUser(user: User): SafeUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };
  }

  private expiresAt(duration: string) {
    const match = duration.match(/^(\d+)([mhd])$/);
    if (!match) {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    const amount = Number(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000
    };

    return new Date(Date.now() + amount * multipliers[unit]);
  }

  private get bcryptRounds() {
    return this.config.get<number>('BCRYPT_ROUNDS') ?? 10;
  }
}
