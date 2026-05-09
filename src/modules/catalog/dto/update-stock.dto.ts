import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class UpdateStockDto {
  @ApiProperty({ example: 25 })
  @IsNumber()
  @Min(0)
  stockQuantity: number;
}
