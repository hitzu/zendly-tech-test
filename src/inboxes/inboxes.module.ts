import { Module } from '@nestjs/common';

import { InboxesController } from './inboxes.controller';
import { InboxesService } from './inboxes.service';
import { Inbox } from './entities/inbox.entity';
import { OperatorInboxSubscriptionsModule } from '../operator-inbox-subscriptions/operator-inbox-subscriptions.module';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inbox]),
    OperatorInboxSubscriptionsModule,
  ],
  controllers: [InboxesController],
  providers: [InboxesService],
  exports: [InboxesService],
})
export class InboxesModule {}
