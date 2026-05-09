import { OrderStatus } from '@prisma/client';
import { ORDER_TRANSITIONS } from './order-status-policy';

describe('order transitions', () => {
  it('allows customer retry/cancel flow before shipping', () => {
    expect(ORDER_TRANSITIONS.pending_payment).toContain(OrderStatus.cancelled);
    expect(ORDER_TRANSITIONS.paid).toContain(OrderStatus.cancelled);
    expect(ORDER_TRANSITIONS.processing).toContain(OrderStatus.cancelled);
  });

  it('blocks cancellation after shipping starts', () => {
    expect(ORDER_TRANSITIONS.shipped).not.toContain(OrderStatus.cancelled);
    expect(ORDER_TRANSITIONS.delivered).not.toContain(OrderStatus.cancelled);
  });
});
