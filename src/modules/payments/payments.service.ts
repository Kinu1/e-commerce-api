import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentStatus, Role } from '@prisma/client';
import { AuthUser } from '../../common/types/authenticated-request';
import { PrismaService } from '../../prisma/prisma.service';
import { SimulatePaymentDto } from './dto/simulate-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async simulate(orderId: string, dto: SimulatePaymentDto, actor: AuthUser) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payments: { orderBy: { createdAt: 'desc' } } }
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (actor.role === Role.customer && order.userId !== actor.id) {
      throw new ForbiddenException('You cannot pay this order');
    }

    if (order.status !== OrderStatus.pending_payment) {
      throw new ConflictException('Order is not pending payment');
    }

    const pendingPayment = order.payments.find((payment) => payment.status === PaymentStatus.pending);

    if (dto.status === PaymentStatus.failed) {
      const data = {
        amount: order.totalAmount,
        status: PaymentStatus.failed,
        failureReason: dto.failureReason ?? 'Simulated payment failure'
      };

      return pendingPayment
        ? this.prisma.payment.update({ where: { id: pendingPayment.id }, data })
        : this.prisma.payment.create({ data: { ...data, orderId } });
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product || product.isDeleted || !product.isActive || product.stockQuantity < item.quantity) {
          throw new ConflictException(`Insufficient stock: ${item.productNameSnapshot}`);
        }
      }

      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { decrement: item.quantity } }
        });
      }

      const paymentData = {
          amount: order.totalAmount,
          status: PaymentStatus.approved,
          paidAt: new Date()
      };

      const payment = pendingPayment
        ? await tx.payment.update({ where: { id: pendingPayment.id }, data: paymentData })
        : await tx.payment.create({ data: { ...paymentData, orderId } });

      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.paid }
      });

      return payment;
    });
  }
}
