import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';
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
  @IsString()
  @IsNotEmpty()
  operatorId!: string;

  @ApiProperty({ example: 'tenant-123' })
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @ApiProperty({
    example: 'OPERATOR',
    enum: ['OPERATOR', 'MANAGER', 'ADMIN'],
  })
  @IsString()
  @IsIn(['OPERATOR', 'MANAGER', 'ADMIN'])
  role!: DevTokenRole;
}

