import { ApiProperty } from '@nestjs/swagger';

import { Inbox } from '../entities/inbox.entity';

export class InboxResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  tenantId!: number;

  @ApiProperty()
  phoneNumber!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty()
  active!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  constructor(inbox: Inbox) {
    this.id = inbox.id;
    this.tenantId = inbox.tenantId;
    this.phoneNumber = inbox.phoneNumber;
    this.displayName = inbox.displayName;
    this.active = inbox.active;
    this.createdAt = inbox.createdAt;
    this.updatedAt = inbox.updatedAt;
  }
}
