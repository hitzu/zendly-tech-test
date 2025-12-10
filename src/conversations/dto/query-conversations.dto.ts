import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ConversationState } from '../conversation-state.enum';

export const CONVERSATION_SORT_OPTIONS = [
  'newest',
  'oldest',
  'priority',
] as const;

export type ConversationSort = (typeof CONVERSATION_SORT_OPTIONS)[number];

export class QueryConversationsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  inboxId?: number;

  @ApiPropertyOptional({ enum: ConversationState })
  @IsOptional()
  @IsEnum(ConversationState)
  state?: ConversationState;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  assignedOperatorId?: number;

  @ApiPropertyOptional({
    description: 'Exact match filter by customer phone number',
  })
  @IsOptional()
  @IsString()
  customerPhoneNumber?: string;

  @ApiPropertyOptional({
    description: 'Exact match filter by label id',
  })
  @IsOptional()
  @IsNumber()
  labelId?: number;

  @ApiPropertyOptional({
    enum: CONVERSATION_SORT_OPTIONS,
    default: 'newest',
  })
  @IsOptional()
  @IsIn(CONVERSATION_SORT_OPTIONS)
  sort?: ConversationSort;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Max(100)
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({ description: 'Alternative to offset', minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}
