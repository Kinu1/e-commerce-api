import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../../common/types/authenticated-request';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CatalogService } from './catalog.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateStockDto } from './dto/update-stock.dto';

@ApiTags('catalog')
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('categories')
  listCategories() {
    return this.catalog.listCategories();
  }

  @Get('categories/:id')
  getCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.getCategory(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto, @CurrentUser() user: AuthUser) {
    return this.catalog.createCategory(dto, user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  @Patch('categories/:id')
  updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.catalog.updateCategory(id, dto, user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('categories/:id')
  deleteCategory(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.catalog.deleteCategory(id, user.id);
  }

  @Get('products')
  listProducts(@Query() query: ProductQueryDto) {
    return this.catalog.listProducts(query);
  }

  @Get('products/:id')
  getProduct(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.getProduct(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  @Post('products')
  createProduct(@Body() dto: CreateProductDto, @CurrentUser() user: AuthUser) {
    return this.catalog.createProduct(dto, user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  @Patch('products/:id')
  updateProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.catalog.updateProduct(id, dto, user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  @Patch('products/:id/stock')
  updateStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStockDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.catalog.updateStock(id, dto.stockQuantity, user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('products/:id')
  deleteProduct(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.catalog.deleteProduct(id, user.id);
  }
}
