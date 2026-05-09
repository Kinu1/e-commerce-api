import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAccessPayload } from './auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET')
    });
  }

  async validate(payload: JwtAccessPayload) {
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, isDeleted: false },
      select: { id: true, email: true, role: true }
    });

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    return user;
  }
}
