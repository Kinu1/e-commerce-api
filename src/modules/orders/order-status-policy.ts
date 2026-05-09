import { OrderStatus } from '@prisma/client';

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: [OrderStatus.paid, OrderStatus.cancelled],
  paid: [OrderStatus.processing, OrderStatus.cancelled],
  processing: [OrderStatus.shipped, OrderStatus.cancelled],
  shipped: [OrderStatus.delivered],
  delivered: [],
  cancelled: []
};
