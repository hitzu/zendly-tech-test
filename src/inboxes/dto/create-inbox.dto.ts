import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateInboxDto {
  @ApiProperty({
    example: '+12025550123',
    description: 'E.164 formatted phone number for the inbox',
  })
  @IsString()
  @IsNotEmpty()
  phoneNumber!: string;

  @ApiProperty({
    example: 'Support Team',
    description: 'Human-friendly name for the inbox',
  })
  @IsString()
  @IsNotEmpty()
  displayName!: string;
}

