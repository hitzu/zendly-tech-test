import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

import { OPERATOR_ROLES } from '../../common/types/operator-roles.type';
import type { Operator } from '../entities/operator.entity';

export class OperatorResponseDto {
  @Expose()
  @ApiProperty({ description: 'Unique operator identifier', example: 'uuid' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Tenant identifier', example: 'tenant-123' })
  tenantId: string;

  @Expose()
  @ApiProperty({ description: 'Operator name', example: 'Jane Operator' })
  name: string;

  @Expose()
  @ApiProperty({
    description: 'Operator role',
    enum: OPERATOR_ROLES,
    example: OPERATOR_ROLES.OPERATOR,
  })
  role: OPERATOR_ROLES;

  constructor(operator: Operator) {
    this.id = operator.id;
    this.tenantId = operator.tenantId;
    this.name = operator.name;
    this.role = operator.role;
  }
}
