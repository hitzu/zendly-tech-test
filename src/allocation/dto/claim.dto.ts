import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ClaimDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  conversationId!: string;
}
