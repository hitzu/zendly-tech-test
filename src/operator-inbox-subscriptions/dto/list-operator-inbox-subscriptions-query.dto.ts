import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber } from 'class-validator';

export class ListOperatorInboxSubscriptionsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  operatorId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  inboxId?: number;
}
