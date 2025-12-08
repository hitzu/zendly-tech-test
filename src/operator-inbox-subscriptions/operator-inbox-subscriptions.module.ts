import { Module } from '@nestjs/common';

import { OperatorInboxSubscriptionsController } from './operator-inbox-subscriptions.controller';
import { OperatorInboxSubscriptionsService } from './operator-inbox-subscriptions.service';
import { OperatorsModule } from '../operator/operators.module';
import { InboxesModule } from '../inboxes/inboxes.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperatorInboxSubscription } from './entities/operator-inbox-subscription.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([OperatorInboxSubscription]),
    OperatorsModule,
    InboxesModule,
  ],
  controllers: [OperatorInboxSubscriptionsController],
  providers: [OperatorInboxSubscriptionsService],
  exports: [OperatorInboxSubscriptionsService],
})
export class OperatorInboxSubscriptionsModule {}
