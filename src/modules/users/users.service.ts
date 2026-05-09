import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, isDeleted: false },
      select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
