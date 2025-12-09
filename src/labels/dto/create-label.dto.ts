import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateLabelDto {
  @ApiProperty({
    description: 'Inbox id the label belongs to',
    example: 1,
  })
  @IsInt()
  @Min(1)
  inboxId!: number;

  @ApiProperty({
    description: 'Human-readable label name',
    example: 'VIP',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    description: 'Optional color (e.g., hex code)',
    example: '#FF5733',
  })
  @IsString()
  @IsOptional()
  color?: string | null;
}

