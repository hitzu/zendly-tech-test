import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ResolveDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  conversationId!: string;
}

