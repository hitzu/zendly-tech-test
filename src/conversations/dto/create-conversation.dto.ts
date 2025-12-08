import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsDateString,
  IsNumberString,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateConversationDto {
  @ApiProperty()
  @IsNumberString()
  tenantId!: number;

  @ApiProperty()
  @IsNumberString()
  inboxId!: number;

  @ApiProperty()
  @IsString()
  externalConversationId!: string;

  @ApiProperty()
  @IsString()
  customerPhoneNumber!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  lastMessageAt?: Date;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  messageCount?: number;
}
