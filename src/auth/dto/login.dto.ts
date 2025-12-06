import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    required: false,
    description: 'Optional operator id to log in as. If omitted, a random operator is used.',
    example: '42',
  })
  @IsOptional()
  @IsString()
  operatorId?: string;
}
