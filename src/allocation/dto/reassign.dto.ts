import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ReassignDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  conversationId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  newOperatorId!: string;
}

