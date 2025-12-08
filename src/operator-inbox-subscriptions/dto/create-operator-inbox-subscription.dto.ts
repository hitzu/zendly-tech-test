import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateOperatorInboxSubscriptionDto {
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  operatorId!: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  inboxId!: number;
}
