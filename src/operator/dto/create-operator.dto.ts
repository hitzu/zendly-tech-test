import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

import { OPERATOR_ROLES } from '../../common/types/operator-roles.type';

export class CreateOperatorDto {
  @ApiProperty({
    description: 'Operator full name',
    example: 'Jane Operator',
  })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'Tenant identifier the operator belongs to',
    example: 'tenant-123',
  })
  @IsNotEmpty()
  @IsString()
  tenantId!: string;

  @ApiProperty({
    description: 'Role assigned to the operator',
    enum: OPERATOR_ROLES,
    example: OPERATOR_ROLES.OPERATOR,
  })
  @IsNotEmpty()
  @IsIn(Object.values(OPERATOR_ROLES))
  role!: OPERATOR_ROLES;
}
