import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Eletronicos' })
  @IsString()
  @Length(2, 80)
  name: string;

  @ApiPropertyOptional({ example: 'Produtos eletronicos e acessorios' })
  @IsOptional()
  @IsString()
  @Length(0, 240)
  description?: string;
}
