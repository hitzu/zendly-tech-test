import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateConversationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  lastMessageAt?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  messageCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  priorityScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerPhoneNumber?: string;
}
