import { ApiProperty } from '@nestjs/swagger';

import { OperatorInboxSubscription } from '../entities/operator-inbox-subscription.entity';

export class OperatorInboxSubscriptionResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  tenantId!: number;

  @ApiProperty()
  operatorId!: number;

  @ApiProperty()
  inboxId!: number;

  @ApiProperty()
  createdAt!: Date;

  constructor(subscription: OperatorInboxSubscription) {
    this.id = subscription.id;
    this.tenantId = subscription.tenantId;
    this.operatorId = subscription.operatorId;
    this.inboxId = subscription.inboxId;
    this.createdAt = subscription.createdAt;
  }
}
