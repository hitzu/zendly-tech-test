import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DeallocateDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  conversationId!: string;
}

