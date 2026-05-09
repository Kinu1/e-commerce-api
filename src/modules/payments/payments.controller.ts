import { Body, Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../../common/types/authenticated-request';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SimulatePaymentDto } from './dto/simulate-payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Roles(Role.customer)
  @Post(':orderId/simulate')
  simulate(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: SimulatePaymentDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.payments.simulate(orderId, dto, user);
  }
}
