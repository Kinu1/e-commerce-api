import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { paginated, getPagination } from '../../common/utils/pagination';
import { slugify } from '../../common/utils/slugify';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async listCategories() {
    return this.prisma.category.findMany({
      where: { isDeleted: false },
      orderBy: { name: 'asc' }
    });
  }

  async getCategory(id: string) {
    const category = await this.prisma.category.findFirst({ where: { id, isDeleted: false } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async createCategory(dto: CreateCategoryDto, actorId: string) {
    const slug = slugify(dto.name);
    await this.ensureCategorySlugAvailable(slug);

    return this.prisma.category.create({
      data: {
        ...dto,
        slug,
        createdById: actorId,
        updatedById: actorId
      }
    });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto, actorId: string) {
    await this.getCategory(id);
    const slug = dto.name ? slugify(dto.name) : undefined;

    if (slug) {
      await this.ensureCategorySlugAvailable(slug, id);
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...dto,
        slug,
        updatedById: actorId
      }
    });
  }

  async deleteCategory(id: string, actorId: string) {
    await this.getCategory(id);
    await this.prisma.category.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), updatedById: actorId }
    });
  }

  async listProducts(query: ProductQueryDto) {
    const pagination = getPagination({ page: query.page, perPage: query.per_page });
    const where: Prisma.ProductWhereInput = {
      isDeleted: false,
      isActive: query.is_active ?? true,
      price: {
        gte: query.min_price,
        lte: query.max_price
      },
      category: query.category ? this.categoryFilter(query.category) : { isDeleted: false }
    };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } }
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: this.productSort(query.sort),
        include: { category: true }
      }),
      this.prisma.product.count({ where })
    ]);

    return paginated(data, total, pagination.page, pagination.perPage, '/api/v1/products');
  }

  async getProduct(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, isDeleted: false },
      include: { category: true }
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async createProduct(dto: CreateProductDto, actorId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id: dto.categoryId, isDeleted: false }
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const slug = slugify(dto.name);
    await this.ensureProductSlugAvailable(slug);

    return this.prisma.product.create({
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        slug,
        description: dto.description,
        price: dto.price,
        stockQuantity: dto.stockQuantity,
        imageUrl: dto.imageUrl,
        isActive: dto.isActive ?? true,
        createdById: actorId,
        updatedById: actorId
      },
      include: { category: true }
    });
  }

  async updateProduct(id: string, dto: UpdateProductDto, actorId: string) {
    await this.getProduct(id);
    const slug = dto.name ? slugify(dto.name) : undefined;

    if (slug) {
      await this.ensureProductSlugAvailable(slug, id);
    }

    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, isDeleted: false }
      });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        slug,
        description: dto.description,
        price: dto.price,
        stockQuantity: dto.stockQuantity,
        imageUrl: dto.imageUrl,
        isActive: dto.isActive,
        updatedById: actorId
      },
      include: { category: true }
    });
  }

  async updateStock(id: string, stockQuantity: number, actorId: string) {
    await this.getProduct(id);
    return this.prisma.product.update({
      where: { id },
      data: { stockQuantity, updatedById: actorId },
      include: { category: true }
    });
  }

  async deleteProduct(id: string, actorId: string) {
    await this.getProduct(id);
    await this.prisma.product.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), updatedById: actorId }
    });
  }

  private productSort(sort: ProductQueryDto['sort']): Prisma.ProductOrderByWithRelationInput {
    const map: Record<NonNullable<ProductQueryDto['sort']>, Prisma.ProductOrderByWithRelationInput> = {
      created_at_desc: { createdAt: 'desc' },
      price_asc: { price: 'asc' },
      price_desc: { price: 'desc' },
      name_asc: { name: 'asc' }
    };

    return map[sort ?? 'created_at_desc'];
  }

  private categoryFilter(category: string): Prisma.CategoryWhereInput {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      category
    );

    return {
      isDeleted: false,
      OR: isUuid ? [{ id: category }, { slug: category }] : [{ slug: category }]
    };
  }

  private async ensureCategorySlugAvailable(slug: string, ignoreId?: string) {
    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (existing && existing.id !== ignoreId) {
      throw new ConflictException('Category slug already exists');
    }
  }

  private async ensureProductSlugAvailable(slug: string, ignoreId?: string) {
    const existing = await this.prisma.product.findUnique({ where: { slug } });
    if (existing && existing.id !== ignoreId) {
      throw new ConflictException('Product slug already exists');
    }
  }
}
