import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  IsNumberString,
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
  @IsNumberString()
  inboxId?: string;

  @ApiPropertyOptional({ enum: ConversationState })
  @IsOptional()
  @IsEnum(ConversationState)
  state?: ConversationState;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  assignedOperatorId?: string;

  @ApiPropertyOptional({
    description: 'Label filter placeholder, reserved for future integration',
  })
  @IsOptional()
  @IsString()
  labelId?: string;

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
