import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';
import { OperatorInboxSubscriptionsController } from './operator-inbox-subscriptions.controller';
import { OperatorInboxSubscriptionsService } from './operator-inbox-subscriptions.service';
import { OperatorInboxSubscription } from './entities/operator-inbox-subscription.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OperatorInboxSubscription])],
  controllers: [OperatorInboxSubscriptionsController],
  providers: [OperatorInboxSubscriptionsService],
  exports: [OperatorInboxSubscriptionsService],
})
export class OperatorInboxSubscriptionsModule {}
