import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    required: false,
    description: 'Optional operator id to log in as. If omitted, a random operator is used.',
    example: '1d2c3b4a-5678-90ab-cdef-1234567890ab',
  })
  @IsOptional()
  @IsString()
  operatorId?: string;
}
