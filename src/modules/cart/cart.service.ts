import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CartStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: string) {
    const cart = await this.getOrCreateActiveCart(userId);
    return this.serializeCart(cart.id);
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, isDeleted: false, isActive: true }
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const cart = await this.getOrCreateActiveCart(userId);
    const existing = await this.prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId: product.id } }
    });
    const nextQuantity = (existing?.quantity ?? 0) + dto.quantity;

    if (product.stockQuantity < nextQuantity) {
      throw new ConflictException('Insufficient stock');
    }

    if (existing) {
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: nextQuantity, unitPriceSnapshot: product.price }
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: product.id,
          quantity: dto.quantity,
          unitPriceSnapshot: product.price
        }
      });
    }

    return this.serializeCart(cart.id);
  }

  async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
    const item = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: { userId, status: CartStatus.active },
        product: { isDeleted: false, isActive: true }
      },
      include: { product: true, cart: true }
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    if (item.product.stockQuantity < dto.quantity) {
      throw new ConflictException('Insufficient stock');
    }

    await this.prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity: dto.quantity, unitPriceSnapshot: item.product.price }
    });

    return this.serializeCart(item.cartId);
  }

  async removeItem(userId: string, itemId: string) {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cart: { userId, status: CartStatus.active } }
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({ where: { id: item.id } });
  }

  private async getOrCreateActiveCart(userId: string) {
    const cart = await this.prisma.cart.findFirst({
      where: { userId, status: CartStatus.active }
    });

    if (cart) {
      return cart;
    }

    return this.prisma.cart.create({ data: { userId } });
  }

  private async serializeCart(cartId: string) {
    const cart = await this.prisma.cart.findUniqueOrThrow({
      where: { id: cartId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                imageUrl: true,
                stockQuantity: true,
                isActive: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    const total = cart.items.reduce(
      (sum, item) => sum + Number(item.unitPriceSnapshot) * item.quantity,
      0
    );

    return { ...cart, total };
  }
}
