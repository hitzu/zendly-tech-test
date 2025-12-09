import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

import { OperatorAvailability } from '../entities/operator-status.entity';

export class UpdateOperatorStatusDto {
  @ApiProperty({ enum: OperatorAvailability })
  @IsEnum(OperatorAvailability)
  status!: OperatorAvailability;
}

