import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateLabelDto {
  @ApiPropertyOptional({
    description: 'Updated label name',
    example: 'Priority',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated color (send empty to clear)',
    example: '#008080',
  })
  @IsString()
  @IsOptional()
  color?: string | null;
}

