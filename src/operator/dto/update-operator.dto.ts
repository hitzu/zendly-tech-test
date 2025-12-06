import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

import { OPERATOR_ROLES } from '../../common/types/operator-roles.type';

export class UpdateOperatorDto {
  @ApiPropertyOptional({ description: 'Operator name', example: 'Jane Doe' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Tenant identifier for the operator',
    example: 'tenant-123',
  })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({
    description: 'Role assigned to the operator',
    enum: OPERATOR_ROLES,
    example: OPERATOR_ROLES.MANAGER,
  })
  @IsOptional()
  @IsIn(Object.values(OPERATOR_ROLES))
  role?: OPERATOR_ROLES;
}

