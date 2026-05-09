import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '@prisma/client';
import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class SimulatePaymentDto {
  @ApiProperty({ enum: [PaymentStatus.approved, PaymentStatus.failed] })
  @IsIn([PaymentStatus.approved, PaymentStatus.failed])
  status: Extract<PaymentStatus, 'approved' | 'failed'>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 240)
  failureReason?: string;
}
