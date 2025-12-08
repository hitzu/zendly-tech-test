import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class MoveInboxDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  conversationId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  newInboxId!: string;
}
