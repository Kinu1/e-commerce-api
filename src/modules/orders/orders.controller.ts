import {
  Body,
  Controller,
  Get,
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
import { OrderQueryDto } from './dto/order-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Roles(Role.customer)
  @Post('checkout')
  checkout(@CurrentUser() user: AuthUser) {
    return this.orders.checkout(user.id);
  }

  @Roles(Role.customer)
  @Get('my-orders')
  myOrders(@CurrentUser() user: AuthUser) {
    return this.orders.myOrders(user.id);
  }

  @Roles(Role.staff, Role.admin)
  @Get()
  listOrders(@Query() query: OrderQueryDto) {
    return this.orders.listOrders(query);
  }

  @Roles(Role.customer, Role.staff, Role.admin)
  @Get(':id')
  getOrder(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.orders.getOrder(id, user);
  }

  @Roles(Role.staff, Role.admin)
  @Patch(':id/status')
  updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.orders.updateStatus(id, dto.status);
  }

  @Roles(Role.customer, Role.staff, Role.admin)
  @Post(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.orders.cancel(id, user);
  }
}
