import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { CartStatus, OrderStatus, PaymentStatus, Prisma, Role } from '@prisma/client';
import { getPagination, paginated } from '../../common/utils/pagination';
import { AuthUser } from '../../common/types/authenticated-request';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderQueryDto } from './dto/order-query.dto';
import { ORDER_TRANSITIONS } from './order-status-policy';

const NON_CANCELLABLE_STATUSES: OrderStatus[] = [
  OrderStatus.shipped,
  OrderStatus.delivered,
  OrderStatus.cancelled
];

const STOCK_RESTORABLE_STATUSES: OrderStatus[] = [OrderStatus.paid, OrderStatus.processing];

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async checkout(userId: string) {
    const cart = await this.prisma.cart.findFirst({
      where: { userId, status: CartStatus.active },
      include: { items: { include: { product: true } } }
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    for (const item of cart.items) {
      if (item.product.isDeleted || !item.product.isActive) {
        throw new ConflictException(`Product unavailable: ${item.product.name}`);
      }
      if (item.product.stockQuantity < item.quantity) {
        throw new ConflictException(`Insufficient stock: ${item.product.name}`);
      }
    }

    const total = cart.items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId,
          totalAmount: total,
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              productNameSnapshot: item.product.name,
              unitPriceSnapshot: item.product.price,
              quantity: item.quantity,
              subtotal: Number(item.product.price) * item.quantity
            }))
          },
          payments: {
            create: {
              status: PaymentStatus.pending,
              amount: total
            }
          }
        },
        include: { items: true, payments: true }
      });

      await tx.cart.update({ where: { id: cart.id }, data: { status: CartStatus.converted } });
      return order;
    });
  }

  async myOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { items: true, payments: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async listOrders(query: OrderQueryDto) {
    const pagination = getPagination({ page: query.page, perPage: query.per_page });
    const where: Prisma.OrderWhereInput = { status: query.status };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        include: { user: { select: { id: true, name: true, email: true } }, items: true, payments: true },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.order.count({ where })
    ]);

    return paginated(data, total, pagination.page, pagination.perPage, '/api/v1/orders');
  }

  async getOrder(id: string, actor: AuthUser) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true, payments: true, user: { select: { id: true, name: true, email: true } } }
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (actor.role === Role.customer && order.userId !== actor.id) {
      throw new ForbiddenException('You cannot access this order');
    }

    return order;
  }

  async updateStatus(id: string, status: OrderStatus) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!ORDER_TRANSITIONS[order.status].includes(status)) {
      throw new ConflictException(`Invalid status transition from ${order.status} to ${status}`);
    }

    return this.prisma.order.update({
      where: { id },
      data: { status },
      include: { items: true, payments: true }
    });
  }

  async cancel(id: string, actor: AuthUser) {
    const order = await this.getOrder(id, actor);

    if (NON_CANCELLABLE_STATUSES.includes(order.status)) {
      throw new ConflictException('Order cannot be cancelled');
    }

    return this.prisma.$transaction(async (tx) => {
      if (STOCK_RESTORABLE_STATUSES.includes(order.status)) {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: { increment: item.quantity } }
          });
        }
      }

      return tx.order.update({
        where: { id },
        data: { status: OrderStatus.cancelled },
        include: { items: true, payments: true }
      });
    });
  }
}
