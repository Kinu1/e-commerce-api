import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentStatus, Role } from '@prisma/client';
import { AuthUser } from '../../common/types/authenticated-request';
import { PrismaService } from '../../prisma/prisma.service';
import { SimulatePaymentDto } from './dto/simulate-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async simulate(orderId: string, dto: SimulatePaymentDto, actor: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
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
          ? tx.payment.update({ where: { id: pendingPayment.id }, data })
          : tx.payment.create({ data: { ...data, orderId } });
      }

      const claimedOrder = await tx.order.updateMany({
        where: { id: orderId, status: OrderStatus.pending_payment },
        data: { status: OrderStatus.paid }
      });

      if (claimedOrder.count !== 1) {
        throw new ConflictException('Order is not pending payment');
      }

      for (const item of order.items) {
        const stockUpdate = await tx.product.updateMany({
          where: {
            id: item.productId,
            isDeleted: false,
            isActive: true,
            stockQuantity: { gte: item.quantity }
          },
          data: { stockQuantity: { decrement: item.quantity } }
        });

        if (stockUpdate.count !== 1) {
          throw new ConflictException(`Insufficient stock: ${item.productNameSnapshot}`);
        }
      }

      const paymentData = {
        amount: order.totalAmount,
        status: PaymentStatus.approved,
        paidAt: new Date()
      };

      const payment = pendingPayment
        ? await tx.payment.update({ where: { id: pendingPayment.id }, data: paymentData })
        : await tx.payment.create({ data: { ...paymentData, orderId } });

      return payment;
    });
  }
}
