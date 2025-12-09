import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AllocationController } from './allocation.controller';
import { AllocationService } from './allocation.service';
import { ConversationRef } from '../conversations/entities/conversation-ref.entity';
import { ConversationsModule } from '../conversations/conversations.module';
import { OperatorInboxSubscriptionsModule } from '../operator-inbox-subscriptions/operator-inbox-subscriptions.module';
import { InboxesModule } from '../inboxes/inboxes.module';
import { OperatorsModule } from '../operators/operators.module';
import { OperatorStatusModule } from '../operator-status/operator-status.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConversationRef]),
    ConversationsModule,
    OperatorInboxSubscriptionsModule,
    InboxesModule,
    OperatorsModule,
    OperatorStatusModule,
  ],
  controllers: [AllocationController],
  providers: [AllocationService],
  exports: [AllocationService],
})
export class AllocationModule {}
