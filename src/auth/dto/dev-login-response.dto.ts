import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString, IsNumber } from 'class-validator';
import type { DevTokenRole } from '../guards/dev-token.guard';

export class DevLoginResponseDto {
  @ApiProperty({
    example: 'DEV.v1.tenant-123.42.OPERATOR.1733472000',
    description: 'Dev-only token. NOT for production use.',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ example: '42' })
  @IsNumber()
  @IsNotEmpty()
  operatorId!: number;

  @ApiProperty({ example: 'tenant-123' })
  @IsNumber()
  @IsNotEmpty()
  tenantId!: number;

  @ApiProperty({
    example: 'OPERATOR',
    enum: ['OPERATOR', 'MANAGER', 'ADMIN'],
  })
  @IsString()
  @IsIn(['OPERATOR', 'MANAGER', 'ADMIN'])
  role!: DevTokenRole;
}
